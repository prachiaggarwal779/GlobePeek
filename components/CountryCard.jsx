
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

function getDisplayText(value, fallback = 'N/A') {
  if (value == null || value === '') return fallback

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return (
      value
        .map((item) => getDisplayText(item, ''))
        .filter(Boolean)
        .join(', ') || fallback
    )
  }

  if (typeof value === 'object') {
    if (value.name != null) return getDisplayText(value.name, fallback)
    if (value.common != null) return getDisplayText(value.common, fallback)
    if (value.official != null) return getDisplayText(value.official, fallback)
    if (value.value != null) return getDisplayText(value.value, fallback)
    if (value.attributes != null) return getDisplayText(value.attributes, fallback)
    if (value.coordinates != null) return getDisplayText(value.coordinates, fallback)

    const nestedValue = Object.values(value).find(
      (item) => item != null && item !== value
    )

    if (nestedValue != null) return getDisplayText(nestedValue, fallback)
  }

  return fallback
}

export default function CountryCard({
  name,
  flag,
  population,
  region,
  capital,
  data,
}) {
  const [imageLoaded, setImageLoaded] = useState(false)

  // Don't render the card if the flag URL is missing.
  if (!flag || typeof flag !== 'string' || !flag.trim()) {
    return null
  }

  const populationNumber = Number(population)

  return (
    <>
      <img
        src={flag}
        alt=""
        style={{ display: 'none' }}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(false)}
      />

      {imageLoaded && (
        <Link
          className="country-card"
          to={`/${encodeURIComponent(getDisplayText(name, 'Unknown'))}`}
          state={data}
        >
          <div className="flag-container">
            <img
              src={flag}
              alt={`${getDisplayText(name, 'Unknown')} flag`}
            />
          </div>

          <div className="card-text">
            <h3 className="card-title">
              {getDisplayText(name, 'Unknown')}
            </h3>

            <p>
              <b>Population: </b>
              {Number.isFinite(populationNumber)
                ? populationNumber.toLocaleString('en-IN')
                : 'N/A'}
            </p>

            <p>
              <b>Region: </b>
              {getDisplayText(region)}
            </p>

            <p>
              <b>Capital: </b>
              {getDisplayText(capital)}
            </p>
          </div>
        </Link>
      )}
    </>
  )
}
