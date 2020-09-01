package main

import (
	"encoding/hex"
	"fmt"
	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/crypto"
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

		fmt.Printf("generated account %v\n", keyfiles[i].Address)
	}

	fmt.Printf("accounts generated\n")

	fmt.Printf("generating geth configmap...\n")

	err = generateConfig(
		"geth-configmap.yml",
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
		"accounts-configmap.yml",
		map[string]interface{}{
			"keyfiles": keyfiles,
		},
	)

	if err != nil {
		fmt.Printf("could not generate accounts configmap: [%v]\n", err)
		return
	}

	fmt.Printf("accounts configmap generated\n")
}

func generateConfig(name string, data interface{}) error {
	tmpl, err := template.ParseFiles("./templates/" + name)
	if err != nil {
		return err
	}

	file, err := os.Create("./configs/" + name)
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
