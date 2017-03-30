FROM mhart/alpine-node-auto

# Install app dependencies
ADD package.json /tmp/package.json
RUN cd /tmp && npm install

# Create app directory
RUN mkdir -p /src/app && cp -a /tmp/node_modules /src/app/
WORKDIR /src/app
ADD . /src/app
ADD . ./devices /src/app/
ADD ./devices/start_clients.sh /

# Application's default ports
EXPOSE 5683

ENTRYPOINT ["/start_clients.sh"]
