import {prisma} from "../db/prisma.js";
import {accountService} from "../services/account.service.js";
import {postLedgerTransaction} from "../services/ledger.service.js";
import {transferService} from "../services/transfer.service.js";
import {accountRepository} from "../repositories/account.repository.js";


async function main() {
    const Alice = await prisma.user.create({
        data: {
            email: 'alice@gmail.com',
            passwordHash: 'not-a-real-hash',
            firstName: 'Alice',
            lastName: 'Njenga',
        }
    });
    const Bob = await prisma.user.create({
        data: {
            email: 'bob@gmail.com',
            passwordHash: 'not-a-real-hash',
            firstName: 'Bob',
            lastName: 'Kingi',
        }
    });
    const treasuryUser = await prisma.user.create({
        data: {
            email: 'treasury@nexbank.test',
            passwordHash: 'not-a-real-hash',
            firstName: 'Treasury',
            lastName: 'System',
        },
    })

    console.log('Users created successfully.')

    //ACCOUNT CREATION
    const treasuryAccount = await prisma.account.create({
        data: {
            accountNumber: 'NXB-TREASURY',
            userId: treasuryUser.id,
            type: 'CHECKING',
            currency: 'KES',
        },
    })
    const AliceAccount = await accountService.createAccount({
        userId: Alice.id,
        type: "CHECKING",
        currency: "KES",
        nickname: 'alice@nex',
        //assume opening balance is zero
    });
    const BobAccount = await accountService.createAccount({
        userId: Bob.id,
        type: "CHECKING",
        currency: "KES",
        nickname: 'bob@nex',
    });

    //seed treasury balance cache, assumes already have money
    await prisma.account.update({
        where: {id: treasuryAccount.id},
        data: {
            balanceCache: 1_000_000_00n
        }
    })

    //Now let's deposit to the 2 accounts
    //fund Alice
    await postLedgerTransaction({
        type: "DEPOSIT",
        description: 'Initial deposit for Alice',
        entries: [
            {accountId: treasuryAccount.id, direction: "DEBIT", amount: 500_00n, currency: "KES"},
            {accountId: AliceAccount.id, direction: "CREDIT", amount: 500_00n, currency: "KES"}
        ],
    })
    //fund Bob
    await postLedgerTransaction({
        type: "DEPOSIT",
        description: 'Initial deposit for Bob',
        entries: [
            {accountId: treasuryAccount.id, direction: "DEBIT", amount: 500_00n, currency: "KES"},
            {accountId: BobAccount.id, direction: "CREDIT", amount: 500_00n, currency: "KES",},
        ],
    });
    console.log(`Alice's and Bob's account created successfully.` +
        `with an initial funding of Ksh. 500 each`
    )
    // transfer from Alice to Bob
    await transferService.transfer({
        requestingUserId: Alice.id,
        fromAccountId: AliceAccount.id,
        toAccountId: BobAccount.id,
        amountCents: 150_00n,
        note: `Alice sends Bob Ksh. 150`
    });

    const updatedAliceAccount = await accountRepository.findAllByUserId(Alice.id)
    const AliceBalance = updatedAliceAccount[0]?.balanceCache
    console.log("Alice's balance: ", AliceBalance)

    const updatedBobAccount = await accountRepository.findAllByUserId(Bob.id)
    const BobBalance = updatedBobAccount[0]?.balanceCache
    console.log("Bob's balance: ", BobBalance)

    if(AliceBalance === (50000n - 15000n) && BobBalance === (50000n + 15000n)) {
        console.log("Alice has successfully transferred Ksh. 150 to Bob")
    }else{
        console.log("Transfer failed")
    }

    // Verify the Transfer record was created alongside the ledger entry
    const transferRecord = await prisma.transfer.findFirst({
        where: { fromAccountId: AliceAccount.id },
    })
    console.log(`Transfer record exists: ${transferRecord ? '✅' : '❌ BUG'}`)
    console.log(`Transfer reference links to ledger: ${
        transferRecord?.ledgerTxnId ? '✅' : '❌ BUG'
    }`)



}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())