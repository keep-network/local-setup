package main

import (
	"context"
	"encoding/json"
	"fmt"
	libp2p "github.com/libp2p/go-libp2p"
	libp2p_peer "github.com/libp2p/go-libp2p-core/peer"
	ping "github.com/libp2p/go-libp2p/p2p/protocol/ping"
	"github.com/multiformats/go-multiaddr"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"time"
)

type Diagnostics struct {
	ConnectedPeers []ConnectedPeer `json:"connected_peers"`
}

type ConnectedPeer struct {
	EthereumAddress string   `json:"ethereum_address"`
	NetworkID       string   `json:"network_id"`
	Multiaddresses  []string `json:"multiaddresses"`
}

// Usage: `go run connectivity_probe.go http://<host>:<port>/diagnostics`
func main() {
	if len(os.Args) != 2 || len(os.Args[1]) == 0 {
		panic("please pass a valid diagnostics endpoint")
	}

	diagnosticsEndpoint := os.Args[1]

	diagnosticsData, err := getDiagnosticsData(diagnosticsEndpoint)
	if err != nil {
		panic(err)
	}

	fmt.Printf(
		"checking %v peers fetched from diagnostics data\n\n",
		len(diagnosticsData.ConnectedPeers),
	)

	ctx := context.Background()

	host, err := libp2p.New(ctx)
	if err != nil {
		panic(err)
	}

	pingService := ping.NewPingService(host)

	for _, peer := range diagnosticsData.ConnectedPeers {
		err = sendPing(pingService, &peer)

		fmt.Printf(
			"peer: %v | available: %v\n",
			peer.NetworkID,
			isAvailable(err),
		)
	}

	if err := host.Close(); err != nil {
		panic(err)
	}
}

func getDiagnosticsData(endpoint string) (*Diagnostics, error) {
	diagnosticsResponse, err := http.Get(endpoint)
	if err != nil {
		return nil, err
	}

	diagnosticsResponseBody, err := ioutil.ReadAll(diagnosticsResponse.Body)
	if err != nil {
		return nil, err
	}

	var diagnosticsData Diagnostics
	err = json.Unmarshal(diagnosticsResponseBody, &diagnosticsData)
	if err != nil {
		return nil, err
	}

	return &diagnosticsData, nil
}

func sendPing(pingService *ping.PingService, peer *ConnectedPeer) error {
	timeout := 5 * time.Second

	ctx, cancelCtx := context.WithTimeout(context.Background(), timeout)
	defer cancelCtx()

	peerID, err := libp2p_peer.IDB58Decode(peer.NetworkID)
	if err != nil {
		return err
	}

	pingService.Host.Peerstore().AddAddrs(
		peerID,
		parseMultiaddresses(peer.Multiaddresses),
		2*timeout,
	)

	return (<-pingService.Ping(ctx, peerID)).Error
}

func parseMultiaddresses(addresses []string) []multiaddr.Multiaddr {
	multiaddresses := make([]multiaddr.Multiaddr, 0)

	for _, address := range addresses {
		multiaddress, err := multiaddr.NewMultiaddr(address)
		if err != nil {
			fmt.Printf(
				"could not parse address string [%v]: [%v]",
				address,
				err,
			)
			continue
		}
		multiaddresses = append(multiaddresses, multiaddress)
	}

	return multiaddresses
}

func isAvailable(pingError error) bool {
	// no error - ping was successful and remote peer supports ping protocol
	if pingError == nil {
		return true
	}

	// `protocol is not supported` error - one of peer's
	// addresses is publicly available but remote peer doesn't
	// support ping protocol
	if strings.Contains(pingError.Error(), "protocol not supported") {
		return true
	}

	// all other cases - peer is PROBABLY not publicly available
	return false
}
