import './load_all';
import { listContracts } from '../src/lib/kernel/quality-contract';
const names = listContracts().map(c => c.domain).sort();
console.log('total:', names.length);
console.log('has security?', names.includes('security'));
console.log('all:', names.join(', '));
