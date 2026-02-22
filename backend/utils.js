import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(execCb);

export { execAsync };