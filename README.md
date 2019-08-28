# AionDumpTracker
AionDumpTracker is a simple nodejs script that track all binance deposit story from a certain Aion address

## Requirement
NodeJs

Aion-web3

nodesmith account

## How to try

1. Get a web3 API key from https://console.nodesmith.io/#/dashboard
2. nmp install aion-web3
3. Download cached transactions file from https://www.dropbox.com/s/1vosgdemize105m/map-0-4002918?dl=0
4. Use your own web3 api key and run the scrpit

## Example
Binance hot wallet address: 0xa0efb50bb6da136d1257e1a52411c9f3fd154b8d69ce7f381a28dc01c5aeef78
One of TRS VC address: 0xa0c6859f3cef43be042d33e319f3929780f76a3138db1df9e492febd97943ea4

You can check the monthly release datail (click tap "transfer" you can see 1.08M) and recently dump info https://mainnet.aion.network/#/account/a0c6859f3cef43be042d33e319f3929780f76a3138db1df9e492febd97943ea4

If You track his outgoing transaction via mainnet dashboard, you can easily find this binance deposit address is:
0xa06b975ff919703b82c13597f3ff7fb27436641765c90c946566b199aece16b5

Unfortunately, aion mainnet dashboard can only show transaction within one month, and other VCs transaction path are much more complicated than this VC, so we need our script

Just run: node AionDumpTracker.js
You will see the deposit path, and every dump story since mainnet.

In this example, we can check that the deposit address printed by this script is as the same as our manully tracking result. 
![image](https://github.com/vito11/AionDumpTracker/blob/master/example.PNG)

You can find more information in the script file
