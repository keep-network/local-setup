package main

import (
	"encoding/hex"
	"fmt"
	"github.com/btcsuite/btcd/btcec"
	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/crypto"
	libp2pcrypto "github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"io/ioutil"
	"os"
	"strconv"
	"strings"
	"text/template"
)

const (
	keystoreDir = "./keystore"
)

func main() {
	fmt.Printf("generating accounts...\n")

	count, err := strconv.Atoi(os.Args[1])
	if err != nil {
		fmt.Printf("could not parse count: [%v]\n", err)
		return
	}

	keyStore := keystore.NewKeyStore(
		keystoreDir,
		keystore.StandardScryptN,
		keystore.StandardScryptP,
	)

	defer os.RemoveAll(keystoreDir)

	type keyfile struct {
		Address    string
		Json       string
		PrivateKey string
	}

	var bootstrapID string
	keyfiles := make([]*keyfile, count)

	for i := 0; i < count; i++ {
		account, err := keyStore.NewAccount("password")
		if err != nil {
			fmt.Printf("could not create account: [%v]\n", err)
			return
		}

		keyfileJson, err := ioutil.ReadFile(account.URL.Path)
		if err != nil {
			fmt.Printf("could not read keyfile: [%v]\n", err)
			return
		}

		key, err := keystore.DecryptKey(keyfileJson, "password")
		if err != nil {
			fmt.Printf("could not decrypt keyfile: [%v]\n", err)
			return
		}

		keyfiles[i] = &keyfile{
			Address:    account.Address.Hex(),
			Json:       string(keyfileJson),
			PrivateKey: hex.EncodeToString(crypto.FromECDSA(key.PrivateKey)),
		}

		if i == 0 {
			bootstrapID, err = getIDFromKey(key)
			if err != nil {
				fmt.Printf("could get bootstrap id: [%v]\n", err)
				return
			}
		}

		fmt.Printf("generated account %v\n", keyfiles[i].Address)
	}

	fmt.Printf("accounts generated\n")

	fmt.Printf("generating geth configmap...\n")

	err = generateConfig(
		"network/geth-configmap.yml",
		"network/geth-configmap.yml",
		map[string]interface{}{
			"etherbase": keyfiles[0].Address,
			"extradata": strings.ToLower(keyfiles[0].Address[2:]),
			"keyfiles":  keyfiles,
		},
	)
	if err != nil {
		fmt.Printf("could not generate geth configmap: [%v]\n", err)
		return
	}

	fmt.Printf("geth configmap generated\n")

	fmt.Printf("generating accounts configmap...\n")

	err = generateConfig(
		"network/accounts-configmap.yml",
		"network/accounts-configmap.yml",
		map[string]interface{}{
			"keyfiles": keyfiles,
		},
	)
	if err != nil {
		fmt.Printf("could not generate accounts configmap: [%v]\n", err)
		return
	}

	fmt.Printf("accounts configmap generated\n")

	fmt.Printf("generating keep clients configs...\n")

	for i := range keyfiles {
		err = generateConfig(
			"clients/keep-client-service.yml",
			fmt.Sprintf("clients/keep-client-%v-service.yml", i),
			map[string]interface{}{
				"clientIndex": i,
			},
		)
		if err != nil {
			fmt.Printf("could not generate keep-client service config: [%v]\n", err)
			return
		}

		err = generateConfig(
			"clients/keep-client-statefulset.yml",
			fmt.Sprintf("clients/keep-client-%v-statefulset.yml", i),
			map[string]interface{}{
				"clientIndex": i,
				"bootstrapID": bootstrapID,
				"owner":       keyfiles[0],
			},
		)
		if err != nil {
			fmt.Printf("could not generate keep-client statefulset config: [%v]\n", err)
			return
		}
	}

	fmt.Printf("keep clients configs generated\n")

}

func getIDFromKey(key *keystore.Key) (string, error) {
	pk, _ := btcec.PrivKeyFromBytes(btcec.S256(), key.PrivateKey.D.Bytes())
	id, err := peer.IDFromPrivateKey((*libp2pcrypto.Secp256k1PrivateKey)(pk))
	if err != nil {
		return "", err
	}

	return id.String(), nil
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
