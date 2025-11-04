#![no_std]
use soroban_sdk::{contract, contracttype, contractimpl, log, Env, Symbol, symbol_short};

// Structure to store liquidity pool information for a token pair
#[contracttype]
#[derive(Clone)]
pub struct LiquidityPool {
    pub token_a_reserve: i128,
    pub token_b_reserve: i128,
    pub total_swaps: u64,
}

// Constant for referencing the liquidity pool
const POOL: Symbol = symbol_short!("POOL");

#[contract]
pub struct TokenSwapContract;

#[contractimpl]
impl TokenSwapContract {

    // Initialize the liquidity pool with initial reserves
    pub fn initialize_pool(env: Env, token_a_amount: i128, token_b_amount: i128) {
        
        let existing_pool: Option<LiquidityPool> = env.storage().instance().get(&POOL);
        
        if existing_pool.is_some() {
            log!(&env, "Pool already initialized!");
            panic!("Pool already exists!");
        }

        if token_a_amount <= 0 || token_b_amount <= 0 {
            log!(&env, "Invalid amounts! Both amounts must be positive.");
            panic!("Invalid amounts!");
        }

        let pool = LiquidityPool {
            token_a_reserve: token_a_amount,
            token_b_reserve: token_b_amount,
            total_swaps: 0,
        };

        env.storage().instance().set(&POOL, &pool);
        env.storage().instance().extend_ttl(5000, 5000);

        log!(&env, "Liquidity Pool Initialized: Token A Reserve: {}, Token B Reserve: {}", 
             token_a_amount, token_b_amount);
    }

    // Swap Token A for Token B using AMM formula
    pub fn swap_a_for_b(env: Env, amount_a_in: i128) -> i128 {
        
        if amount_a_in <= 0 {
            log!(&env, "Invalid swap amount!");
            panic!("Amount must be positive!");
        }

        let mut pool = Self::view_pool(env.clone());

        if pool.token_a_reserve == 0 || pool.token_b_reserve == 0 {
            log!(&env, "Pool not initialized!");
            panic!("Pool not initialized!");
        }

        let amount_b_out = (amount_a_in * pool.token_b_reserve) / (pool.token_a_reserve + amount_a_in);

        pool.token_a_reserve += amount_a_in;
        pool.token_b_reserve -= amount_b_out;
        pool.total_swaps += 1;

        env.storage().instance().set(&POOL, &pool);
        env.storage().instance().extend_ttl(5000, 5000);

        log!(&env, "Swap executed: {} Token A -> {} Token B", amount_a_in, amount_b_out);

        amount_b_out
    }

    // Swap Token B for Token A using AMM formula
    pub fn swap_b_for_a(env: Env, amount_b_in: i128) -> i128 {
        
        if amount_b_in <= 0 {
            log!(&env, "Invalid swap amount!");
            panic!("Amount must be positive!");
        }

        let mut pool = Self::view_pool(env.clone());

        if pool.token_a_reserve == 0 || pool.token_b_reserve == 0 {
            log!(&env, "Pool not initialized!");
            panic!("Pool not initialized!");
        }

        let amount_a_out = (amount_b_in * pool.token_a_reserve) / (pool.token_b_reserve + amount_b_in);

        pool.token_b_reserve += amount_b_in;
        pool.token_a_reserve -= amount_a_out;
        pool.total_swaps += 1;

        env.storage().instance().set(&POOL, &pool);
        env.storage().instance().extend_ttl(5000, 5000);

        log!(&env, "Swap executed: {} Token B -> {} Token A", amount_b_in, amount_a_out);

        amount_a_out
    }

    // View current liquidity pool status
    pub fn view_pool(env: Env) -> LiquidityPool {
        env.storage().instance().get(&POOL).unwrap_or(LiquidityPool {
            token_a_reserve: 0,
            token_b_reserve: 0,
            total_swaps: 0,
        })
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_initialize_and_swap() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TokenSwapContract);
        let client = TokenSwapContractClient::new(&env, &contract_id);

        client.initialize_pool(&1000, &1000);

        let pool = client.view_pool();
        assert_eq!(pool.token_a_reserve, 1000);
        assert_eq!(pool.token_b_reserve, 1000);

        let amount_out = client.swap_a_for_b(&100);
        assert!(amount_out > 0);

        let pool_after = client.view_pool();
        assert_eq!(pool_after.token_a_reserve, 1100);
        assert_eq!(pool_after.total_swaps, 1);
    }
}