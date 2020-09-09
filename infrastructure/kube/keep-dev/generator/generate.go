package main

import (
	"crypto/ecdsa"
	"encoding/hex"
	"fmt"
	"github.com/btcsuite/btcd/btcec"
	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/crypto"
	libp2pcrypto "github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"io/ioutil"
	"os"
	"sort"
	"strconv"
	"strings"
	"text/template"
)

const (
	keystoreDir = "./keystore"
)

type keyfile struct {
	Address    string
	Json       string
	PrivateKey string

	PrivateKeyObject *ecdsa.PrivateKey
}

func main() {
	if os.Args[1] == "network" {
		count, err := strconv.Atoi(os.Args[2])
		if err != nil {
			fmt.Printf("could not parse count: [%v]\n", err)
			return
		}

		err = generateNetworkConfig(count)
		if err != nil {
			fmt.Printf("could not generate network config: [%v]\n", err)
			return
		}
	} else if os.Args[1] == "clients" {
		sanctionedApp := os.Args[2]

		if len(sanctionedApp) == 0 {
			fmt.Printf("could not parse sanctioned application\n")
			return
		}

		err := generateClientsConfig(sanctionedApp)
		if err != nil {
			fmt.Printf("could not generate clients config: [%v]\n", err)
			return
		}
	} else {
		fmt.Printf("unknown command\n")
		return
	}
}

func generateNetworkConfig(count int) error {
	fmt.Printf("generating accounts...\n")

	_ = os.RemoveAll(keystoreDir)

	keyStore := keystore.NewKeyStore(
		keystoreDir,
		keystore.StandardScryptN,
		keystore.StandardScryptP,
	)

	keyfiles := make([]*keyfile, count)

	for i := range keyfiles {
		account, err := keyStore.NewAccount("password")
		if err != nil {
			return err
		}

		keyfile, err := getKeyfile(account.URL.Path)
		if err != nil {
			return err
		}

		keyfiles[i] = keyfile

		fmt.Printf("generated account [%v]\n", keyfiles[i].Address)
	}

	sort.Stable(byAddress(keyfiles))

	fmt.Printf("accounts generated\n")

	fmt.Printf("generating geth configmap...\n")

	err := generateConfig(
		"network/geth-configmap.yaml",
		"network/geth-configmap.yaml",
		map[string]interface{}{
			"etherbase": keyfiles[0].Address,
			"extradata": strings.ToLower(keyfiles[0].Address[2:]),
			"keyfiles":  keyfiles,
		},
	)
	if err != nil {
		return err
	}

	fmt.Printf("geth configmap generated\n")

	fmt.Printf("generating accounts configmap...\n")

	err = generateConfig(
		"network/accounts-configmap.yaml",
		"network/accounts-configmap.yaml",
		map[string]interface{}{
			"keyfiles": keyfiles,
		},
	)
	if err != nil {
		return err
	}

	fmt.Printf("accounts configmap generated\n")

	return nil
}

func generateClientsConfig(sanctionedApp string) error {
	fmt.Printf("generating clients configs...\n")

	files, err := ioutil.ReadDir(keystoreDir)
	if err != nil {
		return err
	}

	keyfiles := make([]*keyfile, len(files))

	for i, file := range files {
		keyfile, err := getKeyfile(keystoreDir + "/" + file.Name())
		if err != nil {
			return err
		}

		keyfiles[i] = keyfile
	}

	sort.Stable(byAddress(keyfiles))

	bootstrapID, err := getIDFromKey(keyfiles[0].PrivateKeyObject)
	if err != nil {
		return err
	}

	for i := range keyfiles {
		err = generateConfig(
			"clients/keep-client-service.yaml",
			fmt.Sprintf("clients/keep-client-%v-service.yaml", i),
			map[string]interface{}{
				"clientIndex": i,
			},
		)
		if err != nil {
			return err
		}

		err = generateConfig(
			"clients/keep-client-statefulset.yaml",
			fmt.Sprintf("clients/keep-client-%v-statefulset.yaml", i),
			map[string]interface{}{
				"clientIndex": i,
				"bootstrapID": bootstrapID,
				"owner":       keyfiles[0],
			},
		)
		if err != nil {
			return err
		}

		err = generateConfig(
			"clients/keep-ecdsa-service.yaml",
			fmt.Sprintf("clients/keep-ecdsa-%v-service.yaml", i),
			map[string]interface{}{
				"clientIndex": i,
			},
		)
		if err != nil {
			return err
		}

		err = generateConfig(
			"clients/keep-ecdsa-statefulset.yaml",
			fmt.Sprintf("clients/keep-ecdsa-%v-statefulset.yaml", i),
			map[string]interface{}{
				"clientIndex":   i,
				"bootstrapID":   bootstrapID,
				"owner":         keyfiles[0],
				"sanctionedApp": sanctionedApp,
			},
		)
		if err != nil {
			return err
		}
	}

	fmt.Printf("clients configs generated\n")

	return nil
}

func getIDFromKey(privateKey *ecdsa.PrivateKey) (string, error) {
	pk, _ := btcec.PrivKeyFromBytes(btcec.S256(), privateKey.D.Bytes())

	id, err := peer.IDFromPrivateKey((*libp2pcrypto.Secp256k1PrivateKey)(pk))
	if err != nil {
		return "", err
	}

	return id.String(), nil
}

func getKeyfile(path string) (*keyfile, error) {
	keyfileJson, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}

	key, err := keystore.DecryptKey(keyfileJson, "password")
	if err != nil {
		return nil, err
	}

	return &keyfile{
		Address:          key.Address.Hex(),
		Json:             string(keyfileJson),
		PrivateKey:       hex.EncodeToString(crypto.FromECDSA(key.PrivateKey)),
		PrivateKeyObject: key.PrivateKey,
	}, nil
}

func generateConfig(input, output string, data interface{}) error {
	tmpl, err := template.ParseFiles("./templates/" + input)
	if err != nil {
		return err
	}

	file, err := os.Create("./configs/" + output)
	if err != nil {
		return err
	}

	err = tmpl.Execute(file, data)
	if err != nil {
		return err
	}

	err = file.Close()
	if err != nil {
		return err
	}

	return nil
}

type byAddress []*keyfile

func (ba byAddress) Len() int {
	return len(ba)
}

func (ba byAddress) Swap(i, j int) {
	ba[i], ba[j] = ba[j], ba[i]
}

func (ba byAddress) Less(i, j int) bool {
	return strings.Compare(
		strings.ToLower(ba[i].Address),
		strings.ToLower(ba[j].Address),
	) < 1
}
