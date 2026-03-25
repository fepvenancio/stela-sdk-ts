import { Account, RpcProvider, hash, uint256, constants } from 'starknet';

const RPC_URL = 'https://rpc.starknet-testnet.lava.build';
const STELA = '0x0109c6caae0c5b4da6e063ed6c02ae784be05aa90806501a48dcfbb213bd7c03';
const BOT_ADDR = '0x5f9b3f0bf7a3231bc4c34fc53624b2b016d9a819813d6161c9aec13dc8a379a';
const BOT_PK = '0x2291ff0a5478d67ec8856fcd89e77505c78602e6736f6710c181fa3fd2fc5f6';
const MUSDC = '0x034a0cf09c79e7f20fb2136212f27b7dd88e91f9a24b2ac50c5c41ff6b30c59d';
const MWETH = '0x07e86764396d61d2179cd1a48033fa4f30897cb172464961a80649aff4da9bdd';
const MDAI  = '0x0479f31a23241b1337375b083099bd1672716edbf908b1b30148a648657a1cee';

function u256Calldata(val) {
  const { low, high } = uint256.bnToUint256(BigInt(val));
  return [low.toString(), high.toString()];
}

const INSCRIPTION_CREATED_SELECTOR = hash.getSelectorFromName('InscriptionCreated');

async function main() {
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const bot = new Account(provider, BOT_ADDR, BOT_PK, '1', constants.TRANSACTION_VERSION.V3);

  console.log('Smoke test: creating 1 inscription with bot...');
  console.log('InscriptionCreated selector:', INSCRIPTION_CREATED_SELECTOR);

  // Simple borrow: 1000 USDC debt, 0.5 WETH collateral, 10 DAI interest, 1 day, deadline Apr 15
  const calldata = [
    '1',       // is_borrow = true
    '1',       // debt_assets.len = 1
    MUSDC,     // debt[0].asset
    '0',       // debt[0].asset_type = ERC20
    ...u256Calldata(1000_000_000n), // debt[0].value = 1000 USDC (6 dec)
    ...u256Calldata(0n),            // debt[0].token_id = 0
    '1',       // interest_assets.len = 1
    MDAI,      // interest[0].asset
    '0',       // interest[0].asset_type = ERC20
    ...u256Calldata(10_000_000_000_000_000_000n), // interest[0].value = 10 DAI (18 dec)
    ...u256Calldata(0n),
    '1',       // collateral_assets.len = 1
    MWETH,     // collateral[0].asset
    '0',       // collateral[0].asset_type = ERC20
    ...u256Calldata(500_000_000_000_000_000n), // collateral[0].value = 0.5 WETH (18 dec)
    ...u256Calldata(0n),
    '86400',   // duration = 1 day
    '1776209861', // deadline = Apr 15, 2026
    '0',       // multi_lender = false
  ];

  console.log('Calldata:', calldata);
  console.log('Calldata length:', calldata.length);

  try {
    const tx = await bot.execute([{
      contractAddress: STELA,
      entrypoint: 'create_inscription',
      calldata,
    }]);
    console.log('TX hash:', tx.transaction_hash);

    // Wait for receipt
    console.log('Waiting for confirmation...');
    for (let i = 0; i < 60; i++) {
      try {
        const receipt = await provider.getTransactionReceipt(tx.transaction_hash);
        console.log('Status:', receipt.execution_status, receipt.finality_status);
        if (receipt.execution_status === 'REVERTED') {
          console.error('REVERTED:', receipt.revert_reason);
          break;
        }
        if (receipt.execution_status === 'SUCCEEDED') {
          // Extract inscription ID from events
          for (const ev of receipt.events) {
            if (ev.keys[0] === INSCRIPTION_CREATED_SELECTOR) {
              const low = BigInt(ev.keys[1]);
              const high = BigInt(ev.keys[2]);
              const id = low + (high << 128n);
              console.log('Inscription ID:', '0x' + id.toString(16));
              console.log('Creator:', ev.data[0]);
              console.log('Is borrow:', ev.data[1]);
            }
          }
          break;
        }
      } catch (e) {
        // not yet
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (e) {
    console.error('Error:', e.message);
    if (e.message.includes('calldata')) console.error('Full error:', e);
  }
}

main().catch(console.error);
