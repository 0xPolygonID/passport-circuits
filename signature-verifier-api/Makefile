.PHONY: run
run: build
	./signature-verifier-api

.PHONY: build
build:
	go build -o signature-verifier-api .

.PHONY: test
test:
	go test -v ./...

.PHONY: lint
lint:
	golangci-lint run
