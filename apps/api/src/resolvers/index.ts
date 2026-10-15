import {authResolver} from "./auth.resolver.js";
import {accountResolver} from "./account.resolver.js";
import {transferResolver} from "./transfer.resolver.js";
import {GraphQLScalarType} from "graphql/type/index.js";
import {Kind} from "graphql/language/index.js";
import {adminResolver} from "./admin.resolver.js";


const BigIntScalar = new GraphQLScalarType({
    name: "BigInt",

    //serialize BigInt to string when sending to client
    serialize(value:unknown): string{
        if(typeof value === "bigint") return value.toString();
        if(typeof value === "number") return BigInt(value).toString();
        throw new Error(`BigInt Scalar cannot serialize value for ${value}`);
    },

    //parsValue JSON to BigInt when receiving data from client
    parseValue(value:unknown): bigint {
        if(typeof value === "string") return BigInt(value)
        if(typeof value === "number") return BigInt(value)
        throw new Error(`BigInt Scalar cannot parse value for ${value}`);
    },

    //parseLiteral when BigInt appears hardcode in query string
    parseLiteral(ast): bigint{
        if(ast.kind === Kind.INT) return BigInt(ast.value);
        if(ast.kind === Kind.STRING) return BigInt(ast.value);
        throw new Error(`BigInt Scalar cannot parse literal for ${ast.kind}`);
    }

})


//merge all resolvers into a single object
export const resolvers = [
    {BigInt:BigIntScalar},//scalar implementation
    authResolver,
    adminResolver,
    accountResolver,
    transferResolver,
]