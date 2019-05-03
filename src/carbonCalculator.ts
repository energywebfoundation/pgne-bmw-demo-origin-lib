import * as Papa from 'papaparse'
import * as fs from 'fs'


export const calculateCredits = async (readingkWh: number, startTime: number, endTime: number): Promise<number> => {
  
  let timeArray = [[], [], [], []]

  const file = fs.readFileSync(process.cwd() + '/csv/TOU.csv')
  const results = Papa.parse(file.toString())["data"]


  for (var i = 0; i < results.length; i++) {
    if (results[i][0].length < 2 && results[i][0].length > 0) {
      timeArray[parseInt(results[i][0]) - 1].push(parseFloat(results[i][2]));
    }
  }

  console.log("startTime: " + startTime)
  console.log("endTime: " + endTime)
  console.log("readingkWh: " + readingkWh)

  let startDate = new Date(startTime * 1000)
  let endDate = new Date(endTime * 1000)

  if (endDate < startDate) {
    console.log("Hello")
    throw "endDate is smaller than startDate"
  }

  console.log("startDate: " + startDate) 
  console.log("endDate: " + endDate)

  const startMonth = startDate.getMonth() + 1
  const startDay = startDate.getDate()
//correct startHour
  const startHour = startDate.getHours() 
  const startMinutes = startDate.getMinutes()
//Correct startSeason
  let startSeason: number = 0
  if (startMonth >= 1 && startMonth < 4) {
    startSeason =  1
  }
  else {
    if (startMonth >= 4 && startMonth < 7) {
      startSeason =  2
    }
    else {
      if (startMonth >= 7 && startMonth < 10) {
        startSeason =  3
      }
      startSeason =  4
    }
  }

  const endMonth = endDate.getMonth() + 1
//correct endHour
  const endHour = endDate.getHours()
  const endDay = endDate.getDate()
  const endMinutes = endDate.getMinutes()
//Correct endSeason
  let endSeason: number = 0
  if (endMonth >= 1 && endMonth < 4) {
    endSeason =  1
  }
  else {
    if (endMonth >= 4 && endMonth < 7) {
      endSeason =  2
    }
    else {
      if (endMonth >= 7 && endMonth < 10) {
        endSeason =  3
      }
      endSeason =  4
    }
  }


  console.log("Start: Season, Month, Day, Hour, Minutes")
  console.log(startSeason, startMonth, startDay, startHour, startMinutes)
  console.log("End: Season, Month, Day, Hour, Minutes")
  console.log(endSeason, endMonth, endDay, endHour, endMinutes)

  //totalMinutes, different formula compared to the spreadsheet 
  const totalMinutes = ((endTime - startTime) / 60)
  let totalHours: number = 0

  if (endDay <= startDay) {
    totalHours = endDate.getHours() - startDate.getHours() + 1
  }
  else {
    totalHours = 24 - startDate.getHours() + endDate.getHours() + 1
  }

  console.log("Total Minutes: " + totalMinutes)
  console.log("Total Hours: " + totalHours)

  let startCI: number = 0.00
  let endCI: number = 0.00
  let midCI: number = 0.00

  if (startDay == endDay && startHour == endHour) {
    //console.log("Chargin time withing the granularity of one hour")
    startCI = timeArray[startSeason - 1][startHour == 0 ? 23 : startHour - 1]
    midCI = 0.00
    endCI = 0.00
  }
  else {
    if (endHour < startHour) {
      //console.log("double day")
      startCI = timeArray[startSeason - 1][startHour == 0 ? 23 : startHour - 1]
      endCI = timeArray[endSeason - 1][endHour == 0 ? 23 : endHour - 1]
      //startHour +1 to 23 hours
      for (var i = startHour + 1; i < 24; i++) {
        midCI += timeArray[startSeason - 1][i - 1]
      }

      //1st hour to one hour before endHour
      for (var i = 1; i < (endHour == 24 ? 0 : endHour); i++) {
        midCI += timeArray[startSeason - 1][i - 1]
      }

      //add the 0 th hour only if the endHour was not 0
      if (endHour != 0) midCI += timeArray[startSeason - 1][23]
    }
    else {
      //console.log("Single Day")
      startCI = timeArray[startSeason - 1][startHour == 0 ? 23 : startHour - 1]
      endCI = timeArray[endSeason - 1][endHour == 0 ? 23 : endHour - 1]
      if ((endHour - startHour) > 1) {
        for (var i = startHour + 1; i < endHour; i++) {
          midCI += timeArray[startSeason - 1][i - 1]
        }
      }
    }
  }

  console.log("CI: ")
  console.log(startCI, midCI, endCI)

  let startCredits: number = 0.00
  let endCredits: number = 0.00
  let midCredits: number = 0.00

  let totalCredits: number = 0.00

  

  if (totalHours == 1) {
    startCredits = ((93.75 / 3.4) - (startCI / 3.4)) * readingkWh * 3.4 * 3.6 * 0.000001;
  }
  else {
    startCredits = ((93.75 / 3.4) - (startCI / 3.4)) * readingkWh * 3.4 * 3.6 * (60 - startMinutes) * (1 / totalMinutes) * 0.000001
  }

  if (totalHours > 2) {
    midCredits = ((93.75 / 3.4) - (midCI / (totalHours - 2) / 3.4)) * (totalHours - 2) * 60 * readingkWh * 3.4 * 3.6 * 0.000001 * (1 / totalMinutes)
  }
  else {
    midCredits = 0.00
  }

  if (totalHours > 1) {
    endCredits = ((93.75 / 3.4) - (endCI / 3.4)) * (endMinutes / totalMinutes) * readingkWh * 3.4 * 3.6 * 0.000001
  }
  else {
    endCredits = 0.00
  }
  
  console.log("Credits: ")
  console.log(startCredits, midCredits, endCredits)
  totalCredits = startCredits + endCredits + midCredits
  console.log("totalCredits: " + totalCredits)


  return startCredits + midCredits + endCredits
}



const main = async () => {

  const file = fs.readFileSync(process.cwd() + '/csv/' + "model" + '.csv')
  const results = Papa.parse(file.toString())["data"]
  let wins: number = 0

  for (var i = 0; i < results.length; i++) {
    try {
      const readingkWh = parseFloat(results[i][2].replace(',', '.'))
      const startTime = (new Date(results[i][3]).getTime() / 1000) + 3600
      const endTime = (new Date(results[i][1]).getTime() / 1000) + 3600

      const csvCredits = parseFloat(results[i][28]).toFixed(15)
      const calcCredits = ((await calculateCredits(readingkWh, startTime, endTime)).toFixed(15))


      if (csvCredits == calcCredits) {
        wins++
        //console.log("HITS ", csvCredits, calcCredits)
      }
      else {
        console.log(i, csvCredits, calcCredits)
      }
      //console.log(" ")

    } catch (err) {
      console.log("Couldn't calculate the total credits " + err)
    }

  }
  console.log("Wins: " + wins + "/" + results.length)




  //   try {
  //     console.log(await calculateCredits(2.183999999999, 1544917080, 1544918820,"TOU"))
  //     console.log("")
  //   }catch(err){
  //     console.log(err)
  //   }
  //
  //   console.log((new Date(1544917080000)).getHours())
}
