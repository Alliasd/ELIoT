FROM mhart/alpine-node-auto

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

# Application's default ports
EXPOSE 5683

STOPSIGNAL WINCH

ENV FILE $FILE
CMD node $FILE





