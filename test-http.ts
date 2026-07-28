async function run() {
  try {
    const res = await fetch('http://localhost:62340/api/v1/exam-schedules')
    console.log(res.status)
    const data = await res.json()
    console.log(JSON.stringify(data).substring(0, 500))
  } catch (error: any) {
    console.log(error.message)
  }
}

run()
