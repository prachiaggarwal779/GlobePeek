
import React, { useEffect, useState } from 'react'
import './CountryDetail.css'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import CountryDetailShimmer from './CountryDetailShimmer'

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
    return (
      value
        .map((item) => getText(item, ''))
        .filter(Boolean)
        .join(', ') || fallback
    )
  }

  if (typeof value === 'object') {
    if (value.name != null) return getText(value.name, fallback)
    if (value.common != null) return getText(value.common, fallback)
    if (value.official != null) return getText(value.official, fallback)
    if (value.value != null) return getText(value.value, fallback)
  }

  return fallback
}

function getCountryName(country) {
  return getText(country.names?.common ?? country.name?.common ?? country.name, 'Unknown')
}

function getNativeName(country) {
  const nativeNames = country.names?.native ?? country.name?.nativeName ?? {}
  const firstNativeName = Object.values(nativeNames)[0]

  return getText(
    firstNativeName ??
      country.names?.official ??
      country.name?.official ??
      getCountryName(country),
    'Unknown'
  )
}

function getCountryFlag(country) {
  return getText(country.flag?.url_svg ?? country.flags?.svg, '')
}

function getCapitals(country) {
  const capitals = country.capitals ?? country.capital ?? []

  const items = Array.isArray(capitals) ? capitals : [capitals]

  return items
    .map((capital) => getText(capital, ''))
    .filter(Boolean)
}

function getCurrencies(country) {
  const currencies = country.currencies ?? {}
  const values = Array.isArray(currencies)
    ? currencies
    : Object.values(currencies)

  return values
    .map((currency) => getText(currency?.name ?? currency, ''))
    .filter(Boolean)
    .join(', ')
}

function getLanguages(country) {
  const languages = country.languages ?? {}
  const values = Array.isArray(languages)
    ? languages
    : Object.values(languages)

  return values
    .map((language) => getText(language, ''))
    .filter(Boolean)
    .join(', ')
}

function getTopLevelDomains(country) {
  const domains = country.tlds ?? country.tld ?? []
  const items = Array.isArray(domains) ? domains : [domains]

  return items
    .map((domain) => getText(domain, ''))
    .filter(Boolean)
}

export default function CountryDetail() {
  const [isDark] = useTheme()
  const { country: countryName } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [countryData, setCountryData] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function fetchJSON(url) {
      if (!API_KEY) {
        throw new Error(
          'RESTCOUNTRIES_API_KEY is missing. Check your .env file and restart Parcel.'
        )
      }

      const response = await fetch(url, {
        headers: API_HEADERS,
        signal: controller.signal,
      })

      let result

      try {
        result = await response.json()
      } catch {
        throw new Error(
          `The API returned an invalid response (${response.status}).`
        )
      }

      if (!response.ok || result.errors?.length) {
        throw new Error(
          result.errors?.map((item) => item.message).join(', ') ||
            `API request failed: ${response.status}`
        )
      }

      return result
    }

    async function loadCountry() {
      try {
        setCountryData(null)
        setNotFound(false)
        setError('')

        let country = state?.names ? state : null

        if (!country) {
          if (!countryName) {
            setNotFound(true)
            return
          }

          const result = await fetchJSON(
            `${API_BASE}/names.common/${encodeURIComponent(countryName)}`
          )

          country = result.data?.objects?.[0]

          if (!country) {
            setNotFound(true)
            return
          }
        }

        const borderCodes = Array.isArray(country.borders)
          ? country.borders
              .map((border) =>
                typeof border === 'string'
                  ? border
                  : border?.codes?.alpha_3 ?? border?.code
              )
              .filter(Boolean)
          : []

        const borders = await Promise.all(
          borderCodes.map(async (code) => {
            try {
              const result = await fetchJSON(
                `${API_BASE}/codes.alpha_3/${encodeURIComponent(code)}`
              )

              const borderCountry = result.data?.objects?.[0]

              return borderCountry
                ? {
                    name: getCountryName(borderCountry),
                    code,
                  }
                : null
            } catch (err) {
              if (err.name === 'AbortError') throw err

              console.error(`Failed to load border ${code}:`, err.message)
              return null
            }
          })
        )

        if (controller.signal.aborted) return

        const population = country.population

        setCountryData({
          name: getCountryName(country),
          nativeName: getNativeName(country),
          population:
            typeof population === 'number' && Number.isFinite(population)
              ? population
              : null,
          region: getText(country.region),
          subregion: getText(country.subregion),
          capital: getCapitals(country),
          flag: getCountryFlag(country),
          tld: getTopLevelDomains(country),
          languages: getLanguages(country) || 'N/A',
          currencies: getCurrencies(country) || 'N/A',
          borders: borders.filter(Boolean),
        })
      } catch (err) {
        if (err.name === 'AbortError') return

        console.error('Failed to load country:', err)

        if (!controller.signal.aborted) {
          setError(err.message || 'Unable to load country details.')
        }
      }
    }

    loadCountry()

    return () => controller.abort()
  }, [countryName, state])

  if (notFound) {
    return (
      <main className={isDark ? 'dark' : ''}>
        <div className="country-details-container">
          <button
            type="button"
            className="back-button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <p>Country not found.</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className={isDark ? 'dark' : ''}>
        <div className="country-details-container">
          <button
            type="button"
            className="back-button"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <p role="alert">Unable to load country details: {error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className={isDark ? 'dark' : ''}>
      <div className="country-details-container">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <i className="fa-solid fa-arrow-left" />&nbsp; Back
        </button>

        {countryData === null ? (
          <CountryDetailShimmer />
        ) : (
          <div className="country-details">
            {countryData.flag && (
              <img
                src={countryData.flag}
                alt={`${countryData.name} flag`}
              />
            )}

            <div className="details-text-container">
              <h1>{countryData.name}</h1>

              <div className="details-text">
                <p><b>Native Name: {countryData.nativeName}</b></p>

                <p>
                  <b>
                    Population:{' '}
                    {countryData.population === null
                      ? 'N/A'
                      : countryData.population.toLocaleString('en-IN')}
                  </b>
                </p>

                <p><b>Region: {countryData.region}</b></p>
                <p><b>Sub Region: {countryData.subregion}</b></p>
                <p><b>Capital: {countryData.capital.join(', ') || 'N/A'}</b></p>
                <p><b>Top Level Domain: {countryData.tld.join(', ') || 'N/A'}</b></p>
                <p><b>Currencies: {countryData.currencies}</b></p>
                <p><b>Languages: {countryData.languages}</b></p>
              </div>

              {countryData.borders.length > 0 && (
                <div className="border-countries">
                  <b>Border Countries: </b>&nbsp;

                  {countryData.borders.map((border) => (
                    <Link
                      key={border.code}
                      to={`/${encodeURIComponent(border.name)}`}
                    >
                      {border.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
