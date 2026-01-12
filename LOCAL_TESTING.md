# Local manual testing

## Commands for testing message formatting

```bash
ralph-dev run -n 3 -p "Say hello and create a todo list with 3 items then run ls -la then grep for session then wait for 15 seconds"
```


## Commands for testing the installation after publishing

### Linux ARM64 glibc (Debian)

```bash
docker run --rm --platform linux/arm64 node:20 sh -c 'npm install -g @wiggumdev/ralph && ralph --version'
```


### Linux ARM64 musl (Alpine)

```bash
docker run --rm --platform linux/arm64 node:20-alpine sh -c 'npm install -g @wiggumdev/ralph && ralph --version'
```


### Linux x64 glibc (Debian)

```bash
docker run --rm --platform linux/amd64 node:20 sh -c 'npm install -g @wiggumdev/ralph && ralph --version'
```

### Linux x64 musl (Alpine)

```bash
docker run --rm --platform linux/amd64 node:20-alpine sh -c 'npm install -g @wiggumdev/ralph && ralph --version'
```
