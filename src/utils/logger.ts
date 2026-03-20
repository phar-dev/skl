// Logger con colores para CLI
import pc from 'picocolors';

export function log(message: string): void {
  console.log(message);
}

export function info(message: string): void {
  console.log(pc.blue('ℹ'), message);
}

export function success(message: string): void {
  console.log(pc.green('✓'), pc.green(message));
}

export function warn(message: string): void {
  console.log(pc.yellow('⚠'), pc.yellow(message));
}

export function error(message: string): void {
  console.error(pc.red('✗'), pc.red(message));
}

export function header(message: string): void {
  console.log(pc.bold(pc.cyan('\n── ' + message + ' ──')));
}

export function item(label: string, value: string): void {
  console.log(`  ${pc.dim(label)}  ${value}`);
}

export function listItem(symbol: string, message: string): void {
  console.log(`  ${symbol} ${message}`);
}

export function bullet(message: string): void {
  console.log(pc.dim('  •'), message);
}

export function subbullet(message: string): void {
  console.log(pc.dim('    ·'), message);
}
