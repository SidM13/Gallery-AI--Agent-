FROM ollama/ollama:latest

COPY start.sh /usr/local/bin/gallery-ollama-start
RUN chmod +x /usr/local/bin/gallery-ollama-start

ENTRYPOINT ["/usr/local/bin/gallery-ollama-start"]
