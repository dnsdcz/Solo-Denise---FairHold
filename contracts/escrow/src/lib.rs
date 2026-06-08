#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, token};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Tenant,
    Landlord,
    Token,
    Balance,
    ProposedDeduction,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn init(env: Env, tenant: Address, landlord: Address, token: Address) {
        tenant.require_auth();
        env.storage().instance().set(&DataKey::Tenant, &tenant);
        env.storage().instance().set(&DataKey::Landlord, &landlord);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Balance, &0_i128);
        env.storage().instance().set(&DataKey::ProposedDeduction, &0_i128);
    }

    pub fn deposit(env: Env, amount: i128) {
        let tenant: Address = env.storage().instance().get(&DataKey::Tenant).unwrap();
        tenant.require_auth();

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token);
        
        client.transfer(&tenant, &env.current_contract_address(), &amount);

        let mut balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap();
        balance += amount;
        env.storage().instance().set(&DataKey::Balance, &balance);
    }

    pub fn propose_deduction(env: Env, amount: i128) {
        let landlord: Address = env.storage().instance().get(&DataKey::Landlord).unwrap();
        landlord.require_auth();

        let balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap();
        assert!(amount <= balance, "Insufficient balance for proposed deduction");

        env.storage().instance().set(&DataKey::ProposedDeduction, &amount);
    }

    pub fn approve_deduction(env: Env) {
        let tenant: Address = env.storage().instance().get(&DataKey::Tenant).unwrap();
        tenant.require_auth();

        let proposed_amount: i128 = env.storage().instance().get(&DataKey::ProposedDeduction).unwrap();
        assert!(proposed_amount > 0, "No deduction proposed");

        let landlord: Address = env.storage().instance().get(&DataKey::Landlord).unwrap();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token);

        let balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap();

        // Transfer deduction to landlord
        client.transfer(&env.current_contract_address(), &landlord, &proposed_amount);

        // Transfer remaining back to tenant
        let remaining = balance - proposed_amount;
        if remaining > 0 {
            client.transfer(&env.current_contract_address(), &tenant, &remaining);
        }

        // Reset state
        env.storage().instance().set(&DataKey::Balance, &0_i128);
        env.storage().instance().set(&DataKey::ProposedDeduction, &0_i128);
    }

    pub fn release_funds(env: Env) {
        let landlord: Address = env.storage().instance().get(&DataKey::Landlord).unwrap();
        landlord.require_auth(); 

        let tenant: Address = env.storage().instance().get(&DataKey::Tenant).unwrap();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token);

        let balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap();

        if balance > 0 {
            client.transfer(&env.current_contract_address(), &tenant, &balance);
        }

        env.storage().instance().set(&DataKey::Balance, &0_i128);
        env.storage().instance().set(&DataKey::ProposedDeduction, &0_i128);
    }

    pub fn get_balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    pub fn get_proposed_deduction(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::ProposedDeduction).unwrap_or(0)
    }
}
