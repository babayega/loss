import { ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { expect } from "chai";
import { parseUnits, parseEther } from "ethers/lib/utils";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe('Liquidity Provider', ()=>{
    let lpContract: Contract,
        uniswapV3: Contract,
        token0: Contract,
        token1: Contract;

    let liqPro: SignerWithAddress;

    let NFT_ID: BigNumber;

    const POSITION_OWNER = '0x11E4857Bb9993a50c685A79AFad4E6F65D518DDa';
    const WHALE = '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503';
    const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const mintTokens = async () => {
        const tokenOwnerSigner = await ethers.provider.getSigner(WHALE);

        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [WHALE],
        });

        //Send ether to wallet for tx fee
        const forceSendContract = await ethers.getContractFactory("ForceSend");
        const forceSend = await forceSendContract.deploy(); // Some contract do not have receive(), so we force send
        await forceSend.deployed();
        await forceSend.go(WHALE, {
          value: parseEther("10"),
        });    

        // ethers.provider.sendTransaction();
        await token0.connect(tokenOwnerSigner).transfer(liqPro.address, parseEther('1000000'));
        await token1.connect(tokenOwnerSigner).transfer(liqPro.address, parseUnits('1000000', 6));

        await network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [WHALE],
          });
    }

    const transferPosition = async () => {
        const tokenOwnerSigner = await ethers.provider.getSigner(POSITION_OWNER);

        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [POSITION_OWNER],
        });

        //Send ether to wallet for tx fee
        const forceSendContract = await ethers.getContractFactory("ForceSend");
        const forceSend = await forceSendContract.deploy(); // Some contract do not have receive(), so we force send
        await forceSend.deployed();
        await forceSend.go(POSITION_OWNER, {
          value: parseEther("10"),
        });
        
        await uniswapV3.connect(tokenOwnerSigner)[["safeTransferFrom(address,address,uint256)"]](
            POSITION_OWNER,
            lpContract.address,
            1);

        await network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [WHALE],
            }); 
    }

    const exitPosition = async () => {
        const tokenOwnerSigner = await ethers.provider.getSigner(POSITION_OWNER);

        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [POSITION_OWNER],
        });

        //Send ether to wallet for tx fee
        const forceSendContract = await ethers.getContractFactory("ForceSend");
        const forceSend = await forceSendContract.deploy(); // Some contract do not have receive(), so we force send
        await forceSend.deployed();
        await forceSend.go(POSITION_OWNER, {
          value: parseEther("10"),
        });
        
        await lpContract.connect(tokenOwnerSigner).exitPosition(1);

        await network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [WHALE],
            }); 
    }
    

    before(async () => {
        const accounts = await ethers.getSigners();
        liqPro = accounts[0];

        token0 = await ethers.getContractAt('IERC20', DAI);//DAI
        token1 = await ethers.getContractAt('IERC20', USDC);//USDC

        await mintTokens();

        //Setup contract
        const LP = await ethers.getContractFactory('LiquidityProvider'); 
        lpContract = await LP.deploy(
            DAI,     // TOKEN0-DAI
            USDC,     // TOKEN1-USDC
            100    // POOL_FEE
        );

        uniswapV3 = await ethers.getContractAt('IERC721', '0xC36442b4a4522E871399CD717aBDD847Ab11FE88');
    })

    describe('user open position from within contract',async () => {
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

    describe('user transfer existing position',async () => {
        it('should transfer existing position to contract',async () => {
            await transferPosition();

            
            const deposit = await lpContract.deposits(1);
            expect(deposit.owner).to.be.eq(POSITION_OWNER);
            expect(deposit.token0).to.be.eq('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984');
            expect(deposit.token1).to.be.eq('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
            expect(deposit.liquidity).to.be.greaterThan(0);
        })

        it('should exit the position of the user',async () => {           
            const token0W = await ethers.getContractAt('IERC20', '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984');//DAI
            const token1W = await ethers.getContractAt('IERC20', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');//USDC

            exitPosition();

            const balAfter0 = await token0W.balanceOf(POSITION_OWNER);
            const balAfter1 = await token1W.balanceOf(POSITION_OWNER);
                        
            expect(balAfter0).to.be.greaterThan(0);
            expect(balAfter1).to.be.greaterThan(0);
        })
    })
    
})