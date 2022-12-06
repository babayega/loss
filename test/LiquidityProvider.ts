import { ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { expect } from "chai";
import { parseUnits, parseEther } from "ethers/lib/utils";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe('Liquidity Provider', ()=>{
    let lpContract: Contract,
        token0: Contract,
        token1: Contract;

    let liqPro: SignerWithAddress;

    let NFT_ID: BigNumber;

    const mintTokens = async () => {
        const tokenOwnerSigner = await ethers.provider.getSigner('0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503');

        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: ['0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'],
        });

        //Send ether to wallet for tx fee
        const forceSendContract = await ethers.getContractFactory("ForceSend");
        const forceSend = await forceSendContract.deploy(); // Some contract do not have receive(), so we force send
        await forceSend.deployed();
        await forceSend.go('0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503', {
          value: parseEther("10"),
        });    

        // ethers.provider.sendTransaction();
        await token0.connect(tokenOwnerSigner).transfer(liqPro.address, parseEther('1000000'));
        await token1.connect(tokenOwnerSigner).transfer(liqPro.address, parseUnits('1000000', 6));

        await network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: ['0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'],
          });
    }
    before(async () => {
        const accounts = await ethers.getSigners();
        liqPro = accounts[0];

        token0 = await ethers.getContractAt('IERC20', '0x6B175474E89094C44Da98b954EedeAC495271d0F');//DAI
        token1 = await ethers.getContractAt('IERC20', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');//USDC

        await mintTokens();

        //Setup contract
        const LP = await ethers.getContractFactory('LiquidityProvider'); 
        lpContract = await LP.deploy(
            '0x6B175474E89094C44Da98b954EedeAC495271d0F',     // TOKEN0-DAI
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',     // TOKEN1-USDC
            100    // POOL_FEE
        );        
    })

    describe('user open position from within contract',async () => {
        // it('should print LP contract',async () => {
        //     console.log('LP', lpContract.address);
        //     console.log('balance DAI', await token0.balanceOf(liqPro.address));
        //     console.log('balance USDC', await token1.balanceOf(liqPro.address));
        // });

        it('should mint new position with 1000 DAI/USDC',async () => {
            await token0.approve(lpContract.address, parseEther('10000'));
            await token1.approve(lpContract.address, parseUnits('10000', 6));

            await lpContract.mintNewPosition(parseEther('1000'),parseUnits('1000', 6));

            NFT_ID = await lpContract.tokenIDs(liqPro.address);
            expect(NFT_ID).to.be.eq(258996);
                        
            const deposit = await lpContract.deposits(NFT_ID);
            expect(deposit.owner).to.be.eq(liqPro.address);
            expect(deposit.token0).to.be.eq(token0.address);
            expect(deposit.token1).to.be.eq(token1.address);
            expect(deposit.liquidity).to.be.eq('999986169004312');
        })

        it('should exit the position of the user',async () => {            
            await lpContract.exitPosition(NFT_ID);            

            const balAfter0 = await token0.balanceOf(liqPro.address);
            const balAfter1 = await token1.balanceOf(liqPro.address);
            
            expect(balAfter0).to.be.eq('999999999999999999999999');
            expect(balAfter1).to.be.eq('999999999999');
        })
    })
    
})