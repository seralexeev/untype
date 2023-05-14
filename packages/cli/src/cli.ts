/* eslint-disable @typescript-eslint/no-var-requires */

if (require.main === module) {
    const [node, , cli, ...rest] = process.argv;
    const { run } = require(`@untype/${cli}/cli`);

    run([node, cli, ...rest]);
}
