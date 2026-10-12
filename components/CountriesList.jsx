
import React, { useEffect, useState } from 'react'
import CountryCard from './CountryCard'
import CountriesListShimmer from './CountriesListShimmer'

const API_KEY = process.env.RESTCOUNTRIES_API_KEY
const API_BASE = 'https://api.restcountries.com/countries/v5'

const API_HEADERS = API_KEY
  ? { Authorization: `Bearer ${API_KEY}` }
  : {}

function getText(value, fallback = 'N/A') {
  if (value == null || value === '') return fallback

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => getText(item, ''))
      .filter(Boolean)
      .join(', ') || fallback
  }

  if (typeof value === 'object') {
    if (value.name != null) return getText(value.name, fallback)
    if (value.common != null) return getText(value.common, fallback)
    if (value.official != null) return getText(value.official, fallback)
    if (value.value != null) return getText(value.value, fallback)
    if (value.attributes != null) return getText(value.attributes, fallback)
    if (value.coordinates != null) return getText(value.coordinates, fallback)

    const nestedValue = Object.values(value).find(
      (item) => item != null && item !== value
    )

    if (nestedValue != null) return getText(nestedValue, fallback)
  }

  return fallback
}

function normalizeCountry(country) {
  return {
    ...country,
    name: {
      common: getText(country.names?.common, 'Unknown'),
      official: getText(country.names?.official, 'Unknown'),
    },
    flags: {
      svg: getText(country.flag?.url_svg, ''),
    },
    region: getText(country.region),
    capital: (Array.isArray(country.capitals) ? country.capitals : [])
      .map((capital) => getText(capital, ''))
      .filter(Boolean),
  }
}

export default function CountriesList({ query = '' }) {
  const [countriesData, setCountriesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCountries() {
      try {
        setLoading(true)
        setError('')

        if (!API_KEY) {
          throw new Error(
            'RESTCOUNTRIES_API_KEY is missing. Check your .env file and restart Parcel.'
          )
        }

        const allCountries = []
        let offset = 0
        let hasMore = true

        while (hasMore) {
          const response = await fetch(
            `${API_BASE}?limit=100&offset=${offset}`,
            {
              headers: API_HEADERS,
              signal: controller.signal,
            }
          )

          let result

          try {
            result = await response.json()
          } catch {
            throw new Error(
              `The API returned an invalid response (${response.status}).`
            )
          }

          if (!response.ok || result.errors?.length) {
            console.error('REST Countries API response:', result)

            throw new Error(
              result.errors?.map((item) => item.message).join(', ') ||
                `API request failed: ${response.status}`
            )
          }

          const countries = result.data?.objects

          if (!Array.isArray(countries)) {
            throw new Error(
              'Unexpected API response: country data was not found.'
            )
          }

          allCountries.push(...countries)

          hasMore = result.data?.meta?.more === true
          offset += countries.length

          if (countries.length === 0) {
            hasMore = false
          }
        }

        if (controller.signal.aborted) return

        setCountriesData(allCountries.map(normalizeCountry))
      } catch (err) {
        if (err.name === 'AbortError') return

        console.error('Failed to fetch countries:', err)
        setError(err.message || 'Unable to load countries.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchCountries()

    return () => controller.abort()
  }, [])

  if (loading) return <CountriesListShimmer />

  if (error) {
    return (
      <div className="countries-container" role="alert">
        <p>Unable to load countries: {error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    )
  }

  const searchQuery = query.trim().toLowerCase()

  const filteredCountries = countriesData.filter((country) => {
    const name = country.name.common.toLowerCase()
    const region = country.region.toLowerCase()

    return name.includes(searchQuery) || region.includes(searchQuery)
  })

  return (
    <div className="countries-container">
      {filteredCountries.length > 0 ? (
        filteredCountries.map((country) => (
          <CountryCard
            key={
              country.codes?.alpha_2 ??
              country.codes?.alpha_3 ??
              country.name.common
            }
            name={country.name.common}
            flag={country.flags.svg}
            population={country.population}
            region={country.region}
            capital={country.capital[0] ?? 'N/A'}
            data={country}
          />
        ))
      ) : (
        <p>No countries found.</p>
      )}
    </div>
  )
}
