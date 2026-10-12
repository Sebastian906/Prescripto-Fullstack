package socket

import (
	"errors"

	"github.com/prometheus/client_golang/prometheus"
)

const (
	BackpressureThreshold = 200
	InboundBufferSize     = 256
	NumWorkers            = 16
	WorkerQueueSize       = 64
)

const (
	MetricInboundLen     = "chat_hub_inbound_len"
	MetricInboundDropped = "chat_hub_inbound_dropped_total"
	DropReasonBackpress  = "backpressure"
)

type Metrics struct {
	Len     prometheus.GaugeFunc
	Dropped *prometheus.CounterVec
}

func RegisterInboundMetrics(lenFn func() float64, reg prometheus.Registerer) (*Metrics, error) {
	if reg == nil {
		reg = prometheus.DefaultRegisterer
	}
	if lenFn == nil {
		lenFn = func() float64 { return 0 }
	}
	m := &Metrics{
		Len: prometheus.NewGaugeFunc(prometheus.GaugeOpts{
			Name: MetricInboundLen,
			Help: "Effective inbound depth: len(inbound) + sum(len(worker queues)).",
		}, lenFn),
		Dropped: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: MetricInboundDropped,
			Help: "Inbound chat messages dropped with client signal instead of silent queue.",
		}, []string{"reason"}),
	}

	if err := reg.Register(m.Len); err != nil {
		var are prometheus.AlreadyRegisteredError
		if errors.As(err, &are) {
			if g, ok := are.ExistingCollector.(prometheus.GaugeFunc); ok {
				m.Len = g
			} else {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	if err := reg.Register(m.Dropped); err != nil {
		var are prometheus.AlreadyRegisteredError
		if errors.As(err, &are) {
			if cv, ok := are.ExistingCollector.(*prometheus.CounterVec); ok {
				m.Dropped = cv
			} else {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	return m, nil
}