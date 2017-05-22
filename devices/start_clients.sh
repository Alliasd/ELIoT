#!/bin/sh

max=10
i=1

# SIGTERM-handler
sigterm_handler() {
  killall node
  wait 
  exit 143; # 128 + 15 -- SIGTERM
}

# SIGINT-handler
sigint_handler() {  
  killall node
  wait 
  exit 130; # 128 + 2 -- SIGINT
}

trap 'sigint_handler' SIGINT
trap 'sigterm_handler' SIGTERM


while [ $i -le $max ]; do
  echo 'Starting client #'$i
  exec node $1 $2 &
  i=$(expr $i + 1)
done

wait


