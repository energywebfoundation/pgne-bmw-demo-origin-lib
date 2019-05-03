import * as fs from 'fs'

const parse = require('csv-parse')

var parseUser = parse({ from: 2, delimiter: ';' }, async function (err, allData) { });

const getMonth = (date: Date): number => {

    return (date.getMonth() + 1)
}

const getNumberHours = (start_date: Date, end_date: Date): number => {

    const startPoint = start_date.getTime()
    const endPoint = end_date.getTime()

    const timeDiffMS = endPoint - startPoint
    //  console.log("timeDiff MS: " + timeDiffMS)

    const timeDiffSec = timeDiffMS / 1000
    //   console.log("timeDiff sec: " + timeDiffSec)

    const timeDiffMin = timeDiffSec / 60
    //   console.log("timeDidd min: " + timeDiffMin)

    const timeDiffHour = timeDiffMin / 60
    //   console.log("timeDiff hour: " + timeDiffHour)
    return (Math.floor(timeDiffHour) + 1)
}

const getStrangeNumberHours = (line: exampleCSVLine): number => {

    if (line.end_day > line.start_day) {

        const o2 = line.end_hour
        const j2 = line.start_hour
        return (Number(o2) + 24 - Number(j2) + 1)
    }
    else {
        return (line.end_hour - line.start_hour + 1)
    }

}

const getCI = (hour: number): number => {
    return Number(ciMapping[hour])
}

const get_mid_hours_total_CI = (line: exampleCSVLine): number => {

    const start_point = line.start_time
    const end_point = line.end_time

    const start_Date = new Date(start_point)
    const end_Date = new Date(end_point)

    // all on same date
    if (start_Date.getDate() == end_Date.getDate()) {

        let ci = 0
        let index = 1
        while (start_Date.getHours() + index < end_Date.getHours()) {
            console.log(start_Date.getHours() + index)
            //   console.log("CI: " + getCI(start_Date.getHours() + index))
            ci += getCI(start_Date.getHours() + index)
            index++

        }

        return ci

    }

    return null
}

interface exampleCSVLine {
    end_time: string,
    energy_kWh: number,
    start_time: string,
    vehicle_id: string,

    start_season: number,
    start_month: number,
    start_day: number,
    start_hour: number,
    start_min: number,
    end_season: number,
    end_month: number,
    end_day: number,
    end_hour: number,
    end_min: number,

    same_day: number,
    number_hours: number,
    start_hour_CI: number,
    mid_hours_total_CI: number,
    end_hours_CI: number,

    number_min: number,
    start_hour_credits: number,
    mid_hour_credits: number,
    end_hour_credits: number,

    total_credits: number


}

const ciMapping = {} as any

const exampleParsings: exampleCSVLine[] = []



const parseCICSV = async (): Promise<any> => {
    return new Promise<any>(resolve => {
        fs.createReadStream(process.cwd() + '/csv/CI.csv')
            .pipe(parse({ from: 2, delimiter: ';' }, function (err, allData) { }))
            .on('data', async (data) => {


                if (data[0] == 4) {

                    ciMapping[data[1]] = data[2]
                }
            }).on('finish', function () {

                resolve()
            })
    })
}

const parseExampleCSV = async (): Promise<any> => {
    return new Promise<any>(resolve => {
        fs.createReadStream(process.cwd() + '/csv/example.csv')
            .pipe(parse({ from: 2, delimiter: ';' }, function (err, allData) { }))
            .on('data', async (data) => {

                const newExampleLine: exampleCSVLine = {
                    end_time: data[1],
                    energy_kWh: data[2],
                    start_time: data[3],
                    vehicle_id: data[4],

                    start_season: data[6],
                    start_month: data[7],
                    start_day: data[8],
                    start_hour: data[9],
                    start_min: data[10],
                    end_season: data[11],
                    end_month: data[12],
                    end_day: data[13],
                    end_hour: data[14],
                    end_min: data[15],

                    same_day: data[17],
                    number_hours: data[18],
                    start_hour_CI: data[19],
                    mid_hours_total_CI: data[20],
                    end_hours_CI: data[21],

                    number_min: data[23],
                    start_hour_credits: data[24],
                    mid_hour_credits: data[25],
                    end_hour_credits: data[26],

                    total_credits: data[28]
                }

                exampleParsings.push(newExampleLine)

            }).on('finish', function () {

                resolve()
            })
    })
}

const main = async () => {
    await parseCICSV()

    await parseExampleCSV()


    let numberCorrect = 0
    let numberFalse = 0
    for (const parsedLine of exampleParsings) {

        const end_time_charge = parsedLine.end_time
        const start_time_charge = parsedLine.start_time

        const end_time_charge_data = new Date(end_time_charge)
        const start_time_charge_data = new Date(start_time_charge)

        if (parsedLine.start_month != getMonth(start_time_charge_data)) {
            console.log("error start_month")
            console.log(parsedLine)
        }

        if (parsedLine.start_day != start_time_charge_data.getDate()) {
            console.log("error start_day")
            console.log(parsedLine)
        }

        if (parsedLine.start_hour != start_time_charge_data.getHours()) {
            console.log("error start_hour")
            console.log(parsedLine)
        }

        if (parsedLine.start_min != start_time_charge_data.getMinutes()) {
            console.log("error start_min")
            console.log(parsedLine)
        }

        if (parsedLine.end_month != getMonth(end_time_charge_data)) {
            console.log("error end_month")
            console.log(parsedLine)
        }

        if (parsedLine.end_day != end_time_charge_data.getDate()) {
            console.log("error end_day")
            console.log(parsedLine)
        }

        if (parsedLine.end_hour != end_time_charge_data.getHours()) {
            console.log("error end_hour")
            console.log(parsedLine)
        }

        if (parsedLine.end_min != end_time_charge_data.getMinutes()) {
            console.log("error end_min")
            console.log(parsedLine)
        }


        if (parsedLine.number_hours != getStrangeNumberHours(parsedLine)) {
            console.log("error number hours")
            console.log(start_time_charge)
            console.log(end_time_charge)

            console.log("csv: " + parsedLine.number_hours + " " + getStrangeNumberHours(parsedLine))
        }

        if (parsedLine.start_hour_CI != getCI(start_time_charge_data.getHours())) {
            console.log("error CI")
            console.log(parsedLine.start_hour_CI)
            console.log(getCI(start_time_charge_data.getHours()))
        }

        if (parsedLine.mid_hours_total_CI != get_mid_hours_total_CI(parsedLine)) {
            console.log("error mid hours")
            console.log(parsedLine.mid_hours_total_CI)
            console.log(get_mid_hours_total_CI(parsedLine))

            numberFalse++
        }
        else {
            console.log("correct mid hours")
            console.log(get_mid_hours_total_CI(parsedLine))
            numberCorrect++
        }








    }

    console.log("false: " + numberFalse)
    console.log("correct: " + numberCorrect)
    console.log("comparing done")
}

main()