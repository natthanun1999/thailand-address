const data = require('./data.json')

function leven (first, second) {
	if (first === second) {
		return 0
	}

	const swap = first

	// Swapping the strings if `a` is longer than `b` so we know which one is the
	// shortest & which one is the longest
	if (first.length > second.length) {
		first = second
		second = swap
	}

	let firstLength = first.length
	let secondLength = second.length

	// Performing suffix trimming:
	// We can linearly drop suffix common to both strings since they
	// don't increase distance at all
	// Note: `~-` is the bitwise way to perform a `- 1` operation
	while (firstLength > 0 && (first.charCodeAt(~-firstLength) === second.charCodeAt(~-secondLength))) {
		firstLength--
		secondLength--
	}

	// Performing prefix trimming
	// We can linearly drop prefix common to both strings since they
	// don't increase distance at all
	let start = 0

	while (start < firstLength && (first.charCodeAt(start) === second.charCodeAt(start))) {
		start++
	}

	firstLength -= start
	secondLength -= start

	if (firstLength === 0) {
		return secondLength
	}

	let bCharacterCode
	let result
	let temporary
	let temporary2
	let index = 0
	let index2 = 0

  const array = []
  const characterCodeCache = []

	while (index < firstLength) {
		characterCodeCache[index] = first.charCodeAt(start + index)
		array[index] = ++index
	}

	while (index2 < secondLength) {
		bCharacterCode = second.charCodeAt(start + index2)
		temporary = index2++
		result = index2

		for (index = 0; index < firstLength; index++) {
			temporary2 = bCharacterCode === characterCodeCache[index] ? temporary : temporary + 1
			temporary = array[index]
			// eslint-disable-next-line no-multi-assign
			result = array[index] = temporary > result ? (temporary2 > result ? result + 1 : temporary2) : (temporary2 > temporary ? temporary + 1 : temporary2)
		}
	}

	return result
}

function toAddress(rawData) {
  const remapped = []

  for (const item of rawData) {
    if (!('provinceList' in item) || !item.provinceList) {
      continue
    }

    for (const province of (item.provinceList || [])) {
      const districtList = (('districtList' in item) && item.districtList)
        ? item.districtList.filter((dl) => dl.proviceId === province.provinceId)
        : []

      for (const district of districtList) {
        const subDistrictList = (('subDistrictList' in item) && item.subDistrictList)
          ? item.subDistrictList.filter((sdl) => sdl.provinceId === district.proviceId && sdl.districtId === district.districtId)
          : []

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
      || (item.subDistrictList && item.subDistrictList.some((subDistrict) => regex.test(subDistrict.subDistrictName)))
      || (item.districtList && item.districtList.some((district) => regex.test(district.districtName)))
      || (item.provinceList && item.provinceList.some((province) => regex.test(province.provinceName)))
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

function getRelateAddress(search, from, limit = 10) {
  const searchRegex = new RegExp(search.value, 'i')
  const fromRegex = new RegExp(from.value, 'i')
  const fromData = data.filter((item) => {
    return (
      (from.field === 'zipCode' && fromRegex.test(item.zipCode))
      || (from.field === 'subDistrict' && item.subDistrictList && item.subDistrictList.some((subDistrict) => fromRegex.test(subDistrict.subDistrictName)))
      || (from.field === 'district' && item.districtList && item.districtList.some((district) => fromRegex.test(district.districtName)))
      || (from.field === 'province' && item.provinceList && item.provinceList.some((province) => fromRegex.test(province.provinceName)))
    )
  })

  const results = fromData.filter((item) => {
    return (
      (search.field === 'zipCode' && searchRegex.test(item.zipCode))
      || (search.field === 'subDistrict' && item.subDistrictList && item.subDistrictList.some((subDistrict) => searchRegex.test(subDistrict.subDistrictName)))
      || (search.field === 'district' && item.districtList && item.districtList.some((district) => searchRegex.test(district.districtName)))
      || (search.field === 'province' && item.provinceList && item.provinceList.some((province) => searchRegex.test(province.provinceName)))
    )
  })

  const remapped = toAddress(results)
  const cleaned = remapped.filter((r) => (
      (search.field === 'zipCode' && searchRegex.test(r.zipCode))
      || (search.field === 'subDistrict' && searchRegex.test(r.subDistrict))
      || (search.field === 'district' && searchRegex.test(r.district))
      || (search.field === 'province' && searchRegex.test(r.province))
    )).slice(0, limit)

  cleaned.sort((a, b) => {
		let aSimilarity = calculateSimilarity(search.value, a)
		let bSimilarity = calculateSimilarity(search.value, b)

		return aSimilarity - bSimilarity
	})

  if (search.field === 'zipCode') {
    return [...new Set(cleaned.map((c) => c.zipCode))].slice(0, limit)
  } else if (search.field === 'subDistrict') {
    return [...new Set(cleaned.map((c) => c.subDistrict))].slice(0, limit)
  } else if (search.field === 'district') {
    return [...new Set(cleaned.map((c) => c.district))].slice(0, limit)
  } else if (search.field === 'province') {
    return [...new Set(cleaned.map((c) => c.province))].slice(0, limit)
  }

  return cleaned
}

function getSubDistricts(search, limit = 10) {
  const regex = new RegExp(search, 'i')
  const results = []

  data.forEach((item) => {
    if (item.subDistrictList && item.subDistrictList.some((subDistrict) => regex.test(subDistrict.subDistrictName))) {
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
    if (item.districtList && item.districtList.some((district) => regex.test(district.districtName))) {
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
    if (item.provinceList && item.provinceList.some((province) => regex.test(province.provinceName))) {
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

module.exports = {
  getAllData: () => data,
  getAutoSuggestion,
  getSubDistricts,
  getDistricts,
  getProvinces,
  getZipCodes,
  getRelateAddress
}