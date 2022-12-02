# Uniswap V3 Impermanent Loss Calculator

It relies on the basic definition of IL, i.e., IL is the difference in the current amount of asset in the LP Pool
vs what it could have been if simply held.

How to run:

```shell
npx ts-node ./index.ts
```

Output:

```shell
Current Price: 0.002863787272550466 WETH/WHALE

WHALE
        * Deposited - 1.0728
        * Current   - 2.704501820858659
WETH
        * Deposited - 0.009999285466536213
        * Current   - 0

Impermanent Loss
        * -1.8599281484410257 WHALE
        * -68.77%
```
