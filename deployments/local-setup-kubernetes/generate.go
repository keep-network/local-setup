package main

import (
	"fmt"
	"github.com/ethereum/go-ethereum/accounts/keystore"
	"io/ioutil"
	"os"
	"strconv"
	"text/template"
)

const (
	keystoreTempDir = "./temporary"
)

func main() {
	fmt.Printf("generating accounts...\n")

	count, err := strconv.Atoi(os.Args[1])
	if err != nil {
		fmt.Printf("could not parse count: [%v]\n", err)
		return
	}

	keyStore := keystore.NewKeyStore(
		keystoreTempDir,
		keystore.StandardScryptN,
		keystore.StandardScryptP,
	)

	defer os.RemoveAll(keystoreTempDir)

	var etherbase string
	addresses := make([]string, count)
	keyfiles := make([]string, count)

	for i := 0; i < count; i++ {
		account, err := keyStore.NewAccount("password")
		if err != nil {
			fmt.Printf("could not create account: [%v]\n", err)
			return
		}

		address := account.Address.Hex()

		if i == 0 {
			etherbase = address
		}

		addresses[i] = address

		keyfile, err := ioutil.ReadFile(account.URL.Path)
		if err != nil {
			fmt.Printf("could not read keyfile: [%v]\n", err)
			return
		}

		keyfiles[i] = string(keyfile)

		fmt.Printf("generated account %v\n", address)
	}

	fmt.Printf("accounts generated\n")

	fmt.Printf("generating geth configmap...\n")

	err = generateConfig(
		"geth-configmap.yml",
		map[string]interface{}{
			"etherbase": etherbase,
			"addresses": addresses,
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
		map[string][]string{
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
