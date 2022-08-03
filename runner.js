const { spawn } = require('child_process')

const log = (data) => console.log(`[${new Date().toUTCString()}]${data}`)

run()

function run() {
    log('Starting process...')
    const child = spawn('node', [`${__dirname}/bot.js`])

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')


    child.stdout.on('data', (data) => {
        log(`[stdout] ${data.toString().trim()}`)
    })

    child.stderr.on('data', (data) => {
        log(`[stderr] ${data.toString().trim()}`)
    })

    child.on('error', err => { log(`[error] ${err}`) })
    child.on('close', exitCode => { log(`Exit code: ${exitCode}`); setTimeout(run, 3000) })
}