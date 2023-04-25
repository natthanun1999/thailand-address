import leven from 'leven'
import data from './data.json' assert { type: 'json' }

function toAddress(rawData) {
  const remapped = []

  for (const item of rawData) {
    for (const province of (item?.provinceList || [])) {
      const districtList = item?.districtList?.filter((dl) => dl.proviceId === province.provinceId) || []

      for (const district of districtList) {
        const subDistrictList = item?.subDistrictList?.filter((sdl) => sdl.provinceId === district.proviceId && sdl.districtId === district.districtId) || []

        for (const subDistrict of subDistrictList) {
          remapped.push({
            zipCode: item.zipCode,
            subDistrict: subDistrict.subDistrictName,
            district: district.districtName,
            province: province.provinceName
          })
        }
      }
    }
  }
  return remapped
}

function calculateSimilarity(query, addressData, target = null) {
  if (target) {
    const similarities = [leven(query, addressData[target])]
  
    return Math.min(...similarities)
  }

  const { zipCode, subDistrict, district, province } = addressData
	const similarities = [
		leven(query, zipCode),
		leven(query, subDistrict),
		leven(query, district),
		leven(query, province)
	]

	return Math.min(...similarities)
}

function getAutoSuggestion(search, limit = 10) {
  const regex = new RegExp(search, 'i')
  const results = []

  data.forEach((item) => {
    if (
      regex.test(item.zipCode)
      || item?.subDistrictList?.some((subDistrict) => regex.test(subDistrict.subDistrictName))
      || item?.districtList?.some((district) => regex.test(district.districtName))
      || item?.provinceList?.some((province) => regex.test(province.provinceName))
    ) {
      results.push(item)
    }
  })

  const remapped = toAddress(results)
  const cleaned = remapped.filter((r) => (
      regex.test(r.zipCode)
      || regex.test(r.subDistrict)
      || regex.test(r.district)
      || regex.test(r.province)
    )).slice(0, limit)

  cleaned.sort((a, b) => {
		let aSimilarity = calculateSimilarity(search, a)
		let bSimilarity = calculateSimilarity(search, b)

		return aSimilarity - bSimilarity
	})

  return cleaned
}

function getSubDistricts(search, limit = 10) {
  const regex = new RegExp(search, 'i')
  const results = []

  data.forEach((item) => {
    if (item?.subDistrictList?.some((subDistrict) => regex.test(subDistrict.subDistrictName))) {
      results.push(item)
    }
  })

  const remapped = toAddress(results)
  const cleaned = remapped.filter((r) => regex.test(r.subDistrict))

  return [...new Set(cleaned.map((c) => c.subDistrict))].slice(0, limit)
}

function getDistricts(search, limit = 10) {
  const regex = new RegExp(search, 'i')
  const results = []

  data.forEach((item) => {
    if (item?.districtList?.some((district) => regex.test(district.districtName))) {
      results.push(item)
    }
  })

  const remapped = toAddress(results)
  const cleaned = remapped.filter((r) => regex.test(r.district))

  return [...new Set(cleaned.map((c) => c.district))].slice(0, limit)
}

function getProvinces(search, limit = 10) {
  const regex = new RegExp(search, 'i')
  const results = []

  data.forEach((item) => {
    if (item?.provinceList?.some((province) => regex.test(province.provinceName))) {
      results.push(item)
    }
  })

  const remapped = toAddress(results)
  const cleaned = remapped.filter((r) => regex.test(r.province))

  return [...new Set(cleaned.map((c) => c.province))].slice(0, limit)
}

function getZipCodes(search, limit = 10) {
  const regex = new RegExp(search, 'i')
  const results = []

  data.forEach((item) => {
    if (regex.test(item.zipCode)) {
      results.push(item)
    }
  })

  const remapped = toAddress(results)
  const cleaned = remapped.filter((r) => regex.test(r.zipCode))

  return [...new Set(cleaned.map((c) => c.zipCode))].slice(0, limit)
}

console.log('zip', getZipCodes('201'))

export default {
  getAllData: () => data,
  getAutoSuggestion,
  getSubDistricts,
  getDistricts,
  getProvinces,
  getZipCodes
}