#!/bin/sh

num=0
docker-compose scale server=1 presence=1 weather=1

while [ $num -lt 1000 ]
do
num=$(($num + 100))
echo $num
docker-compose scale light=$num #radiator=$num
sleep 15
done


