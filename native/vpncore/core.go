package vpncore

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"syscall"

	box "github.com/sagernet/sing-box"
	"github.com/sagernet/sing-box/option"
)

type SocketProtector interface {
	ProtectSocket(fd int) bool
}

type CoreInstance struct {
	mu          sync.Mutex
	boxInstance *box.Box
	protector   SocketProtector
	cancelFunc  context.CancelFunc
}

var globalInstance *CoreInstance

func StartCore(tunFd int, baseConfigJson string, protector SocketProtector) error {
	if globalInstance != nil {
		return errors.New("ядро уже запущено")
	}

	var options option.Options
	if err := json.Unmarshal([]byte(baseConfigJson), &options); err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(context.Background())

	dialerControl := func(network, address string, c syscall.RawConn) error {
		var protectErr error
		err := c.Control(func(fd uintptr) {
			if !protector.ProtectSocket(int(fd)) {
				protectErr = errors.New("protect error")
			}
		})
		if err != nil {
			return err
		}
		return protectErr
	}

	_ = dialerControl

	instance, err := box.New(box.Options{
		Context: ctx,
		Options: options,
	})
	if err != nil {
		cancel()
		return err
	}

	if err := instance.Start(); err != nil {
		cancel()
		return err
	}

	globalInstance = &CoreInstance{
		boxInstance: instance,
		protector:   protector,
		cancelFunc:  cancel,
	}

	return nil
}

func HotSwapOutbound(outboundJson string) error {
	if globalInstance == nil {
		return errors.New("ядро не инициализировано")
	}

	globalInstance.mu.Lock()
	defer globalInstance.mu.Unlock()

	var newOutbound option.Outbound
	if err := json.Unmarshal([]byte(outboundJson), &newOutbound); err != nil {
		return err
	}

	return globalInstance.boxInstance.Outbound().Add(newOutbound)
}

func StopCore() error {
	if globalInstance == nil {
		return nil
	}

	globalInstance.mu.Lock()
	defer globalInstance.mu.Unlock()

	globalInstance.cancelFunc()
	err := globalInstance.boxInstance.Close()
	globalInstance = nil
	return err
}
