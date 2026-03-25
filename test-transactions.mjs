import { Account, RpcProvider, hash, num, uint256, constants } from 'starknet';

// ─── Config ─────────────────────────────────────────────────────────
const RPC_URL = 'https://starknet-sepolia.drpc.org';

const STELA = '0x0109c6caae0c5b4da6e063ed6c02ae784be05aa90806501a48dcfbb213bd7c03';

const BOT_ADDR  = '0x5f9b3f0bf7a3231bc4c34fc53624b2b016d9a819813d6161c9aec13dc8a379a';
const BOT_PK    = '0x2291ff0a5478d67ec8856fcd89e77505c78602e6736f6710c181fa3fd2fc5f6';
const MFER_ADDR = '0x24a7abe720dabf8fc221f9bca11e6d5ada55589028aa6655099289e87dffb1b';
const MFER_PK   = '0x49671d3072bea599eddbcb0f9a34e2c8c21a0ecf20e4e36ff3c33895eac721c';

const MUSDC = '0x034a0cf09c79e7f20fb2136212f27b7dd88e91f9a24b2ac50c5c41ff6b30c59d'; // 6 dec
const MWETH = '0x07e86764396d61d2179cd1a48033fa4f30897cb172464961a80649aff4da9bdd'; // 18 dec
const MDAI  = '0x0479f31a23241b1337375b083099bd1672716edbf908b1b30148a648657a1cee'; // 18 dec

const MAX_U128 = '0xffffffffffffffffffffffffffffffff';

// InscriptionCreated event selector
const INSCRIPTION_CREATED_SELECTOR = hash.getSelectorFromName('InscriptionCreated');

// ─── Helpers ────────────────────────────────────────────────────────
function u256Calldata(val) {
  const { low, high } = uint256.bnToUint256(BigInt(val));
  return [low.toString(), high.toString()];
}

function assetCalldata(tokenAddr, assetType, value, tokenId = 0n) {
  return [
    tokenAddr,
    String(assetType), // 0=ERC20
    ...u256Calldata(value),
    ...u256Calldata(tokenId),
  ];
}

function createInscriptionCalldata(params) {
  const cd = [];
  cd.push(params.isBorrow ? '1' : '0');

  // debt_assets array
  cd.push(String(params.debtAssets.length));
  for (const a of params.debtAssets) cd.push(...assetCalldata(a.token, a.type, a.value));

  // interest_assets array
  cd.push(String(params.interestAssets.length));
  for (const a of params.interestAssets) cd.push(...assetCalldata(a.token, a.type, a.value));

  // collateral_assets array
  cd.push(String(params.collateralAssets.length));
  for (const a of params.collateralAssets) cd.push(...assetCalldata(a.token, a.type, a.value));

  cd.push(String(params.duration));
  cd.push(String(params.deadline));
  cd.push(params.multiLender ? '1' : '0');

  return cd;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForTx(provider, txHash, retries = 60) {
  for (let i = 0; i < retries; i++) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt.execution_status === 'SUCCEEDED' || receipt.finality_status === 'ACCEPTED_ON_L2') {
        return receipt;
      }
      if (receipt.execution_status === 'REVERTED') {
        console.error(`  TX REVERTED: ${txHash}`);
        console.error(`  Reason: ${receipt.revert_reason || 'unknown'}`);
        return receipt;
      }
    } catch (e) {
      // Not yet available
    }
    await sleep(3000);
  }
  console.error(`  TX timeout: ${txHash}`);
  return null;
}

function extractInscriptionIds(receipt) {
  const ids = [];
  if (!receipt || !receipt.events) return ids;
  for (const ev of receipt.events) {
    // InscriptionCreated has inscription_id as key[1] (low) and key[2] (high)
    if (ev.keys && ev.keys.length >= 3 && ev.keys[0] === INSCRIPTION_CREATED_SELECTOR) {
      const low = BigInt(ev.keys[1]);
      const high = BigInt(ev.keys[2]);
      const id = low + (high << 128n);
      ids.push(id);
    }
  }
  return ids;
}

// ─── Token Amounts ──────────────────────────────────────────────────
const USDC_DECIMALS = 6n;
const WETH_DECIMALS = 18n;
const DAI_DECIMALS = 18n;

function usdc(amount) { return BigInt(Math.round(amount * 1e6)); }
function weth(amount) { return BigInt(Math.round(amount * 1e4)) * 10n**14n; }
function dai(amount) { return BigInt(Math.round(amount * 1e4)) * 10n**14n; }

// ─── Inscription Templates ─────────────────────────────────────────
const DEADLINE = 1776209861; // April 15, 2026

// Varying amounts for realistic test data
const LOAN_CONFIGS = [
  // { debtToken, debtAmt, collToken, collAmt, intToken, intAmt, duration, multiLender }
  // Type 1: Borrow USDC against WETH, pay interest in DAI (most common)
  { debt: MUSDC, dAmt: usdc(500),    coll: MWETH, cAmt: weth(0.3),  int: MDAI, iAmt: dai(5),     dur: 86400,   ml: false },
  { debt: MUSDC, dAmt: usdc(1000),   coll: MWETH, cAmt: weth(0.5),  int: MDAI, iAmt: dai(10),    dur: 86400,   ml: false },
  { debt: MUSDC, dAmt: usdc(2500),   coll: MWETH, cAmt: weth(1.2),  int: MDAI, iAmt: dai(25),    dur: 259200,  ml: false },
  { debt: MUSDC, dAmt: usdc(5000),   coll: MWETH, cAmt: weth(2.5),  int: MDAI, iAmt: dai(50),    dur: 604800,  ml: false },
  { debt: MUSDC, dAmt: usdc(10000),  coll: MWETH, cAmt: weth(5.0),  int: MDAI, iAmt: dai(100),   dur: 2592000, ml: false },
  { debt: MUSDC, dAmt: usdc(750),    coll: MWETH, cAmt: weth(0.4),  int: MDAI, iAmt: dai(8),     dur: 172800,  ml: false },
  { debt: MUSDC, dAmt: usdc(3000),   coll: MWETH, cAmt: weth(1.5),  int: MDAI, iAmt: dai(30),    dur: 1209600, ml: false },
  { debt: MUSDC, dAmt: usdc(1500),   coll: MWETH, cAmt: weth(0.8),  int: MDAI, iAmt: dai(15),    dur: 432000,  ml: false },

  // Type 2: Borrow WETH against USDC collateral, interest in DAI
  { debt: MWETH, dAmt: weth(0.5),    coll: MUSDC, cAmt: usdc(2000), int: MDAI, iAmt: dai(8),     dur: 86400,   ml: false },
  { debt: MWETH, dAmt: weth(1.0),    coll: MUSDC, cAmt: usdc(4000), int: MDAI, iAmt: dai(15),    dur: 259200,  ml: false },
  { debt: MWETH, dAmt: weth(2.0),    coll: MUSDC, cAmt: usdc(8000), int: MDAI, iAmt: dai(30),    dur: 604800,  ml: false },
  { debt: MWETH, dAmt: weth(0.25),   coll: MUSDC, cAmt: usdc(1000), int: MDAI, iAmt: dai(4),     dur: 172800,  ml: false },

  // Type 3: Borrow DAI against WETH, interest in USDC
  { debt: MDAI,  dAmt: dai(1000),    coll: MWETH, cAmt: weth(0.5),  int: MUSDC, iAmt: usdc(10),  dur: 86400,   ml: false },
  { debt: MDAI,  dAmt: dai(5000),    coll: MWETH, cAmt: weth(2.5),  int: MUSDC, iAmt: usdc(50),  dur: 604800,  ml: false },
  { debt: MDAI,  dAmt: dai(2000),    coll: MWETH, cAmt: weth(1.0),  int: MUSDC, iAmt: usdc(20),  dur: 259200,  ml: false },

  // Swaps (duration=0) - USDC <-> WETH
  { debt: MUSDC, dAmt: usdc(1000),   coll: MWETH, cAmt: weth(0.5),  int: MDAI, iAmt: dai(5),     dur: 0,       ml: false },
  { debt: MUSDC, dAmt: usdc(2000),   coll: MWETH, cAmt: weth(1.0),  int: MDAI, iAmt: dai(10),    dur: 0,       ml: false },
  { debt: MWETH, dAmt: weth(0.5),    coll: MUSDC, cAmt: usdc(2000), int: MDAI, iAmt: dai(5),     dur: 0,       ml: false },
  { debt: MWETH, dAmt: weth(1.0),    coll: MUSDC, cAmt: usdc(4000), int: MDAI, iAmt: dai(10),    dur: 0,       ml: false },
  { debt: MDAI,  dAmt: dai(500),     coll: MWETH, cAmt: weth(0.25), int: MUSDC, iAmt: usdc(3),   dur: 0,       ml: false },

  // Multi-lender loans (no swaps, per contract rules)
  { debt: MUSDC, dAmt: usdc(10000),  coll: MWETH, cAmt: weth(5.0),  int: MDAI, iAmt: dai(100),   dur: 604800,  ml: true },
  { debt: MUSDC, dAmt: usdc(25000),  coll: MWETH, cAmt: weth(12.0), int: MDAI, iAmt: dai(250),   dur: 2592000, ml: true },
  { debt: MUSDC, dAmt: usdc(50000),  coll: MWETH, cAmt: weth(25.0), int: MDAI, iAmt: dai(500),   dur: 604800,  ml: true },
  { debt: MWETH, dAmt: weth(5.0),    coll: MUSDC, cAmt: usdc(20000),int: MDAI, iAmt: dai(50),    dur: 1209600, ml: true },
  { debt: MDAI,  dAmt: dai(10000),   coll: MWETH, cAmt: weth(5.0),  int: MUSDC, iAmt: usdc(100), dur: 604800,  ml: true },
];

function buildParams(cfg) {
  return {
    isBorrow: true,
    debtAssets: [{ token: cfg.debt, type: 0, value: cfg.dAmt }],
    interestAssets: [{ token: cfg.int, type: 0, value: cfg.iAmt }],
    collateralAssets: [{ token: cfg.coll, type: 0, value: cfg.cAmt }],
    duration: cfg.dur,
    deadline: DEADLINE,
    multiLender: cfg.ml,
  };
}

// Generate 50 inscription configs per wallet by cycling through templates with slight variations
function generateConfigs(count) {
  const configs = [];
  for (let i = 0; i < count; i++) {
    const template = LOAN_CONFIGS[i % LOAN_CONFIGS.length];
    // Scale amounts slightly based on index for variety
    const scale = 1 + (i % 5) * 0.2; // 1.0, 1.2, 1.4, 1.6, 1.8
    configs.push({
      ...template,
      dAmt: BigInt(Math.round(Number(template.dAmt) * scale)),
      cAmt: BigInt(Math.round(Number(template.cAmt) * scale)),
      iAmt: BigInt(Math.round(Number(template.iAmt) * scale)),
    });
  }
  return configs;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const bot = new Account(provider, BOT_ADDR, BOT_PK);
  const mfer = new Account(provider, MFER_ADDR, MFER_PK);

  console.log('=== Stela Test Transaction Generator ===\n');

  // ─── Phase 1: Approve tokens for bot ─────────────────────────
  console.log('Phase 1: Setting up bot token approvals...');
  try {
    const approveCalls = [MUSDC, MWETH, MDAI].map(token => ({
      contractAddress: token,
      entrypoint: 'approve',
      calldata: [STELA, MAX_U128, '0'], // u256(MAX_U128, 0)
    }));

    const approveTx = await bot.execute(approveCalls);
    console.log(`  Approve tx: ${approveTx.transaction_hash}`);
    const approveReceipt = await waitForTx(provider, approveTx.transaction_hash);
    if (approveReceipt?.execution_status === 'REVERTED') {
      console.error('  FATAL: Approve failed. Aborting.');
      process.exit(1);
    }
    console.log('  Bot approvals set!\n');
  } catch (e) {
    console.error('  Approve error:', e.message);
    process.exit(1);
  }

  // ─── Phase 2: Create inscriptions ────────────────────────────
  const CREATES_PER_WALLET = 50;
  const BATCH_SIZE = 3; // creates per transaction
  const SIGN_COUNT = 30; // how many to sign from each wallet

  const botConfigs = generateConfigs(CREATES_PER_WALLET);
  const mferConfigs = generateConfigs(CREATES_PER_WALLET);

  // Rotate mfer configs to get different patterns
  for (let i = 0; i < 7; i++) mferConfigs.push(mferConfigs.shift());

  const botInscriptionIds = [];
  const mferInscriptionIds = [];
  const botInscriptionMeta = []; // track which configs were used (for signing compatibility)
  const mferInscriptionMeta = [];

  console.log(`Phase 2: Creating ${CREATES_PER_WALLET} inscriptions per wallet (batched ${BATCH_SIZE}/tx)...\n`);

  // Create bot inscriptions
  console.log('--- Bot inscriptions ---');
  for (let i = 0; i < botConfigs.length; i += BATCH_SIZE) {
    const batch = botConfigs.slice(i, i + BATCH_SIZE);
    const calls = batch.map(cfg => ({
      contractAddress: STELA,
      entrypoint: 'create_inscription',
      calldata: createInscriptionCalldata(buildParams(cfg)),
    }));

    try {
      const tx = await bot.execute(calls);
      console.log(`  Batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(botConfigs.length/BATCH_SIZE)}: ${tx.transaction_hash}`);
      const receipt = await waitForTx(provider, tx.transaction_hash);

      if (receipt?.execution_status === 'REVERTED') {
        console.error(`  Batch REVERTED! Reason: ${receipt.revert_reason}`);
        // Try individual calls
        for (let j = 0; j < batch.length; j++) {
          try {
            const singleTx = await bot.execute([calls[j]]);
            console.log(`    Retry ${i+j}: ${singleTx.transaction_hash}`);
            const singleReceipt = await waitForTx(provider, singleTx.transaction_hash);
            if (singleReceipt?.execution_status !== 'REVERTED') {
              const ids = extractInscriptionIds(singleReceipt);
              botInscriptionIds.push(...ids);
              botInscriptionMeta.push(batch[j]);
            }
          } catch (e2) {
            console.error(`    Individual create failed: ${e2.message}`);
          }
          await sleep(2000);
        }
      } else {
        const ids = extractInscriptionIds(receipt);
        botInscriptionIds.push(...ids);
        for (const cfg of batch) botInscriptionMeta.push(cfg);
        console.log(`    Created ${ids.length} inscriptions (total: ${botInscriptionIds.length})`);
      }
    } catch (e) {
      console.error(`  Batch error: ${e.message}`);
    }
    await sleep(2000);
  }

  console.log(`\n  Bot total inscriptions created: ${botInscriptionIds.length}\n`);

  // Create mfer inscriptions
  console.log('--- Mfer inscriptions ---');
  for (let i = 0; i < mferConfigs.length; i += BATCH_SIZE) {
    const batch = mferConfigs.slice(i, i + BATCH_SIZE);
    const calls = batch.map(cfg => ({
      contractAddress: STELA,
      entrypoint: 'create_inscription',
      calldata: createInscriptionCalldata(buildParams(cfg)),
    }));

    try {
      const tx = await mfer.execute(calls);
      console.log(`  Batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(mferConfigs.length/BATCH_SIZE)}: ${tx.transaction_hash}`);
      const receipt = await waitForTx(provider, tx.transaction_hash);

      if (receipt?.execution_status === 'REVERTED') {
        console.error(`  Batch REVERTED! Reason: ${receipt.revert_reason}`);
        for (let j = 0; j < batch.length; j++) {
          try {
            const singleTx = await mfer.execute([calls[j]]);
            console.log(`    Retry ${i+j}: ${singleTx.transaction_hash}`);
            const singleReceipt = await waitForTx(provider, singleTx.transaction_hash);
            if (singleReceipt?.execution_status !== 'REVERTED') {
              const ids = extractInscriptionIds(singleReceipt);
              mferInscriptionIds.push(...ids);
              mferInscriptionMeta.push(batch[j]);
            }
          } catch (e2) {
            console.error(`    Individual create failed: ${e2.message}`);
          }
          await sleep(2000);
        }
      } else {
        const ids = extractInscriptionIds(receipt);
        mferInscriptionIds.push(...ids);
        for (const cfg of batch) mferInscriptionMeta.push(cfg);
        console.log(`    Created ${ids.length} inscriptions (total: ${mferInscriptionIds.length})`);
      }
    } catch (e) {
      console.error(`  Batch error: ${e.message}`);
    }
    await sleep(2000);
  }

  console.log(`\n  Mfer total inscriptions created: ${mferInscriptionIds.length}\n`);

  // ─── Phase 3: Sign inscriptions (cross-sign) ────────────────
  // Mfer signs bot's inscriptions (mfer = lender, bot = borrower)
  // Bot signs mfer's inscriptions (bot = lender, mfer = borrower)
  // Only sign non-multi-lender ones at 100%, and multi-lender ones at partial percentages

  const SIGN_BATCH = 3;

  const botToSign = botInscriptionIds.slice(0, Math.min(SIGN_COUNT, botInscriptionIds.length));
  const mferToSign = mferInscriptionIds.slice(0, Math.min(SIGN_COUNT, mferInscriptionIds.length));

  console.log(`Phase 3: Signing inscriptions...`);
  console.log(`  Mfer will sign ${botToSign.length} of bot's inscriptions`);
  console.log(`  Bot will sign ${mferToSign.length} of mfer's inscriptions\n`);

  // Mfer signs bot's inscriptions
  console.log('--- Mfer signing bot inscriptions ---');
  for (let i = 0; i < botToSign.length; i += SIGN_BATCH) {
    const batch = botToSign.slice(i, i + SIGN_BATCH);
    const calls = batch.map((id, j) => {
      const metaIdx = i + j;
      const isMulti = metaIdx < botInscriptionMeta.length && botInscriptionMeta[metaIdx].ml;
      // For multi-lender, sign partial (50% = 5000 BPS). For single, 100% = 10000 BPS (ignored by contract)
      const pct = isMulti ? 5000n : 10000n;
      return {
        contractAddress: STELA,
        entrypoint: 'sign_inscription',
        calldata: [...u256Calldata(id), ...u256Calldata(pct)],
      };
    });

    try {
      const tx = await mfer.execute(calls);
      console.log(`  Sign batch ${Math.floor(i/SIGN_BATCH)+1}/${Math.ceil(botToSign.length/SIGN_BATCH)}: ${tx.transaction_hash}`);
      const receipt = await waitForTx(provider, tx.transaction_hash);
      if (receipt?.execution_status === 'REVERTED') {
        console.error(`  Sign batch REVERTED: ${receipt.revert_reason}`);
        // Try individually
        for (let j = 0; j < calls.length; j++) {
          try {
            const singleTx = await mfer.execute([calls[j]]);
            console.log(`    Retry sign ${i+j}: ${singleTx.transaction_hash}`);
            const sr = await waitForTx(provider, singleTx.transaction_hash);
            if (sr?.execution_status === 'REVERTED') {
              console.error(`    Sign REVERTED: ${sr.revert_reason}`);
            } else {
              console.log(`    Signed OK`);
            }
          } catch (e2) {
            console.error(`    Individual sign failed: ${e2.message}`);
          }
          await sleep(2000);
        }
      } else {
        console.log(`    Signed ${batch.length} inscriptions OK`);
      }
    } catch (e) {
      console.error(`  Sign error: ${e.message}`);
    }
    await sleep(2000);
  }

  // Bot signs mfer's inscriptions
  console.log('\n--- Bot signing mfer inscriptions ---');
  for (let i = 0; i < mferToSign.length; i += SIGN_BATCH) {
    const batch = mferToSign.slice(i, i + SIGN_BATCH);
    const calls = batch.map((id, j) => {
      const metaIdx = i + j;
      const isMulti = metaIdx < mferInscriptionMeta.length && mferInscriptionMeta[metaIdx].ml;
      const pct = isMulti ? 5000n : 10000n;
      return {
        contractAddress: STELA,
        entrypoint: 'sign_inscription',
        calldata: [...u256Calldata(id), ...u256Calldata(pct)],
      };
    });

    try {
      const tx = await bot.execute(calls);
      console.log(`  Sign batch ${Math.floor(i/SIGN_BATCH)+1}/${Math.ceil(mferToSign.length/SIGN_BATCH)}: ${tx.transaction_hash}`);
      const receipt = await waitForTx(provider, tx.transaction_hash);
      if (receipt?.execution_status === 'REVERTED') {
        console.error(`  Sign batch REVERTED: ${receipt.revert_reason}`);
        for (let j = 0; j < calls.length; j++) {
          try {
            const singleTx = await bot.execute([calls[j]]);
            console.log(`    Retry sign ${i+j}: ${singleTx.transaction_hash}`);
            const sr = await waitForTx(provider, singleTx.transaction_hash);
            if (sr?.execution_status === 'REVERTED') {
              console.error(`    Sign REVERTED: ${sr.revert_reason}`);
            } else {
              console.log(`    Signed OK`);
            }
          } catch (e2) {
            console.error(`    Individual sign failed: ${e2.message}`);
          }
          await sleep(2000);
        }
      } else {
        console.log(`    Signed ${batch.length} inscriptions OK`);
      }
    } catch (e) {
      console.error(`  Sign error: ${e.message}`);
    }
    await sleep(2000);
  }

  // ─── Summary ─────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  console.log(`Bot inscriptions created: ${botInscriptionIds.length}`);
  console.log(`Mfer inscriptions created: ${mferInscriptionIds.length}`);
  console.log(`Total inscriptions: ${botInscriptionIds.length + mferInscriptionIds.length}`);
  console.log(`Bot inscriptions signed by mfer: ${botToSign.length}`);
  console.log(`Mfer inscriptions signed by bot: ${mferToSign.length}`);
  console.log(`Open inscriptions: ${botInscriptionIds.length - botToSign.length + mferInscriptionIds.length - mferToSign.length}`);

  console.log('\nBot inscription IDs:');
  for (const id of botInscriptionIds) console.log(`  0x${id.toString(16)}`);
  console.log('\nMfer inscription IDs:');
  for (const id of mferInscriptionIds) console.log(`  0x${id.toString(16)}`);

  console.log('\nDone!');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
