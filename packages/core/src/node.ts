import { spawn } from 'node:child_process';

export const $ = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const command = String.raw(strings, ...values);

    let stdout = '';
    await new Promise<void>((resolve, reject) => {
        const process = spawn(command, { shell: true, stdio: ['inherit', 'pipe', 'inherit'] });

        process.stdout?.on('data', (data) => {
            stdout += data;
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command ${command} exited with code ${code}`));
            }
        });

        process.on('error', (error) => {
            reject(error);
        });

        process.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command ${command} exited with code ${code}`));
            }
        });
    });

    return stdout;
};
