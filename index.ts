import { request, gql } from 'graphql-request'
import {createClient} from './wsClient'

let user_pos = {}
let pool_pos = {}
const TICK_BASE = 1.0001

const position_query = gql`
query get_position($position_id: ID!) {
    positions(where: {id: $position_id}) {
      liquidity
      depositedToken0
      depositedToken1
      tickLower { tickIdx }
      tickUpper { tickIdx }
      pool { id }
      token0 {
        symbol
        decimals
      }
      token1 {
        symbol
        decimals
      }
    }
  }
`;

const pool_query = gql`
query get_pools($pool_id: ID!) {
    pools(where: {id: $pool_id}) {
      tick
      sqrtPrice
    }
  }
`;

function tickToPrice(tick: number){
    return TICK_BASE ** tick
}

async function getPosData(){
    const data = await request(
      'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      position_query, 
      {
        position_id:9994
      });
    
    if (data['positions'].length == 0) {
        console.log('no position found')
        process.exit(0)
    }

    const position = data['positions'][0]
    user_pos['liquidity'] = parseInt(position["liquidity"])

    if (user_pos['liquidity'] == 0) {
      console.log(`No liquidity present`)
      process.exit(0);
    }
    user_pos['token_amt_0'] = parseFloat(position['depositedToken0'])
    user_pos['token_amt_1'] = parseFloat(position['depositedToken1'])
    user_pos['tick_lower'] = parseInt(position["tickLower"]["tickIdx"])
    user_pos['tick_upper'] = parseInt(position["tickUpper"]["tickIdx"])
    user_pos['pool_id'] = position["pool"]["id"]

    user_pos['token0'] = position["token0"]["symbol"]
    user_pos['token1'] = position["token1"]["symbol"]
    user_pos['decimals0'] = parseInt(position["token0"]["decimals"])
    user_pos['decimals1'] = parseInt(position["token1"]["decimals"])    
}

async function getPoolData() {
    const data = await request(
      'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      pool_query,
      {
        pool_id:user_pos['pool_id']
      }
      );
    
    if (data['pools'].length == 0) {
        console.log('no position found')
        process.exit(0)
    }

    const pool = data['pools'][0]
    pool_pos['current_tick'] = parseInt(pool["tick"])
    pool_pos['current_sqrt_price'] = parseInt(pool["sqrtPrice"]) / (2 ** 96)    
}

async function exitPosition() {
  
}


async function run() {
  //wss://api.thegraph.com:8443/subgraphs/name/mavvverick/dov-eth
  //wss://api.thegraph.com:8443/subgraphs/name/uniswap/uniswap-v3
  // const client = await createClient('ws://api.thegraph.com/subgraphs/name/mavvverick/dov-eth')
  // client.ping({'hello':'world'});
    await getPosData();
    await getPoolData();
  //   client.addEventListener('open', () => {
  //     console.log('here');
  //     client.send('hello!');
  // });

    const current_price = tickToPrice(pool_pos['current_tick']);
    const adj_curr_price = current_price / (10**(user_pos['decimals1']-user_pos['decimals0']))

    console.log(`Current Price: ${adj_curr_price} ${user_pos['token1']}/${user_pos['token0']}\n`);

    const lower_price = tickToPrice(user_pos['tick_lower'] / 2)
    const upper_price = tickToPrice(user_pos['tick_upper'] / 2)
    
    let amount0: number;
    let amount1: number;

    if (user_pos['tick_upper'] <= pool_pos['current_tick']){
        // Only token1 locked
        amount0 = 0
        amount1 = user_pos['liquidity'] * (upper_price - lower_price)
    } else if (user_pos['tick_lower'] < pool_pos['current_tick'] && pool_pos['current_tick'] < user_pos['tick_lower']) {
        // Both tokens present
        amount0 = user_pos['liquidity'] * (upper_price - pool_pos['current_sqrt_price']) / (pool_pos['current_sqrt_price'] * upper_price)
        amount1 = user_pos['liquidity'] * (pool_pos['current_sqrt_price'] - lower_price)
    } else {
        // Only token0 locked
        amount0 = user_pos['liquidity'] * (upper_price - lower_price) / (lower_price * upper_price)
        amount1 = 0;
    }

    const adj_amt0 = amount0 / (10**user_pos['decimals0']);
    const adj_amt1 = amount1 / (10**user_pos['decimals1']);

    console.log(`${user_pos['token0']}`)
    console.log(`\t* Deposited - ${user_pos['token_amt_0']}`)
    console.log(`\t* Current   - ${adj_amt0}`)
    console.log(`${user_pos['token1']}`)
    console.log(`\t* Deposited - ${user_pos['token_amt_1']}`)
    console.log(`\t* Current   - ${adj_amt1}\n`)

    const current_value = adj_amt0 + adj_amt1/adj_curr_price;
    const hodl_value = user_pos['token_amt_0'] + user_pos['token_amt_1']/adj_curr_price;

    

    if (current_value > hodl_value) {
      console.log(`No IL for this position`);
      process.exit(0);
    }

    console.log(`Impermanent Loss`)
    console.log(`\t* ${current_value - hodl_value} ${user_pos['token0']}`)
    console.log(`\t* ${(((current_value - hodl_value)/current_value)*100).toFixed(2)}%`)
}

run()




//Initial token0 amt - c0
    //token0 lower limit - cl
    //Initial token1 amt - a0
    //token1 high limit - ah
    //current price - p1
    //current token0 amt - c1
    //current token1 amt - a1

    //x1 = 1938166.362146-2293438.328906 = -355271.96676
    //P1 = 0.0007769
    //y1 = 387.790086997232252477 - 218.346203127256127809 = 169.443883
    //x0 = 1938166.362146
    //y0 = 387.790086997232252477
    //P1*x1 + y1 =  0.0007769 * -355271.96676 + 169.443883 = -276.0107909758 + 169.443883 = -106.5669079758
    //P1*x0 + y0= 0.0007769 * 1938166.362146 +387.790086997232252477 = 1505.7614467512 +387.790086997232252477 = 1893.5515337484
    //(P1*x1 + y1)/(P1*x0 + y0) - 1= -106.5669079758/1893.5515337484 - 1= -0.05627885277 - 1 = -1.0562788528

    // IL = Current value of assets - HODL value
    // IL = (Notional value of current asets) - (Initial token amount * current prices)

    //computedFee = feeTier * 24hVolume * (userTotalLiquidity / (existingLiquidity + userTotalLiquidity))