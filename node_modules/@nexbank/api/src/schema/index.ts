import {readFileSync} from "fs";
import {dirname, join} from "path"
import {fileURLToPath} from "url";

//get the dirname
const __dirname = dirname(fileURLToPath(import.meta.url));

//read as utf and join
function read(filename: string):string {
    return readFileSync(join(__dirname, filename), "utf8");
}
//export as typeDefs
export const typeDefs = [
    read('base.graphql'),
    read('auth.graphql'),
    read('admin.graphql'),
    read('account.graphql'),
    read('transfer.graphql'),
].join('\n');