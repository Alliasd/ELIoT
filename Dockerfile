FROM mhart/alpine-node-auto

# Install app dependencies
ADD package.json /tmp/package.json
RUN cd /tmp && npm install

# Create app directory
RUN mkdir -p /src/app && cp -a /tmp/node_modules /src/app/

#Bundle app source
ADD . /src/app

#Set the working directory to point to the device applications
WORKDIR /src/app/devices

# Application's default ports
EXPOSE 5683

ENTRYPOINT [ "node" ]


