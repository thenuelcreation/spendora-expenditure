FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/spendora ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/spendora /spendora
USER nonroot
EXPOSE 8080
ENTRYPOINT ["/spendora"]
