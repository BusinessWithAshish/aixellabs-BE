## Contributing

### Development workflow

- Branch from `main`
- Keep changes focused and small; write clear commit messages
- Ensure TypeScript builds: `pnpm run build`


### Code style

- TypeScript strict mode is enabled
- Prefer explicit types on exported functions and public APIs
- Keep functions small and readable; handle errors meaningfully


### Testing endpoints locally

- Use curl examples in `docs/api.md`
- For SSE, use `curl -N` or a browser EventSource client

