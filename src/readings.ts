import localdata from '../../csv/vehicleChargeEvents.json'

export interface Meterreadings {
    vehicleId: string,
    startTimeString: string,
    startTime: number,
    endTimeString: string,
    endTime: number,
    energy_Wh: number
}

/**
 * this funciton will return all meterreadings that started between startTime and endTime
 */
export async function getAllMeterreadings(startTime: number, endTime: number): Promise<Meterreadings[]> {

    const result: Meterreadings[] = []

    console.log(`getting meterreadings from ${startTime} = ${new Date(startTime * 1000)} to ${endTime} = ${new Date(endTime * 1000)}`)

    console.log("got " + localdata.length + " entries for started chargings in the provided timespan.")

    for (const dataEntry of localdata) {
        //        console.log(dataEntry)
        const vehicleId = dataEntry.vehicle_id
        const energy_Wh = dataEntry.energy_kWh * 1000
        const startTimeCharging = dataEntry.start_time
        const endTimeCharging = dataEntry.end_time

        const startTimeUnix = Number((new Date(startTimeCharging).getTime() / 1000).toFixed(0))
        const endTimeUnix = Number((new Date(endTimeCharging).getTime() / 1000).toFixed(0))

        const newMeterreadingResult: Meterreadings = {
            vehicleId: vehicleId,
            startTimeString: startTimeCharging,
            startTime: startTimeUnix,
            endTimeString: endTimeCharging,
            endTime: endTimeUnix,
            energy_Wh: energy_Wh,
        }

        result.push(newMeterreadingResult)

    }
    return result
}

export async function getNewMeterreadings(startTime: number, endTime: number, chargingEnd: number): Promise<Meterreadings[]> {

    const result: Meterreadings[] = []

    const allReadings = await getAllMeterreadings(startTime, endTime)


    for (const meterread of allReadings) {
        if (meterread.endTime > chargingEnd) {
            result.push(meterread)
        }
    }

    return result
}