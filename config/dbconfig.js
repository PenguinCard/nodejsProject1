const option1 = {
    host : 'localhost',
    user : 'test',
    password : '000000',
    database : 'new_test'
}

const option2 = {
    url: 'mongodb://localhost:27017/nowinparis',
    opt: { useNewUrlParser: true, useUnifiedTopology: true }
}

export { option1 as mysqlconfig, option2 as mongoConfig }