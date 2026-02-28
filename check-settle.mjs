import { RpcProvider, hash } from 'starknet';
const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/demo' });

const cls = await provider.getClassByHash('0x3553cff51db7718c4df992fa8168758007823225804d0d757361efb82d2c79e');
const ext = cls.entry_points_by_type?.EXTERNAL || [];
const settleSelector = hash.getSelectorFromName('settle');
console.log('settle selector:', settleSelector);
console.log('Total external entrypoints:', ext.length);

const found = ext.find(e => BigInt(e.selector) === BigInt(settleSelector));
console.log('settle found:', found ? 'YES' : 'NO');

if (!found) {
  console.log('All selectors:');
  ext.forEach(e => console.log('  ', e.selector));
}

// Also check the ABI
const abi = cls.abi;
if (abi) {
  const settleAbi = abi.find(item => item.name === 'settle' || (item.items && item.items.find(i => i.name === 'settle')));
  console.log('\nABI settle entry:', settleAbi ? JSON.stringify(settleAbi).slice(0, 200) : 'NOT FOUND');

  // Search all items
  for (const item of abi) {
    if (item.items) {
      for (const sub of item.items) {
        if (sub.name === 'settle') {
          console.log('Found settle in:', item.name, '->', sub.name);
        }
      }
    }
  }
}
