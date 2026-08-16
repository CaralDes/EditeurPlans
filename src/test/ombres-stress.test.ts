import { describe, it, expect } from 'vitest'
import { mursEnSegments, polygoneVisibilite, type Segment } from '../lib/ombres'
import type { Point } from '../types'

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function vraieDistance(origine: Point, angle: number, segments: Segment[], rayonMax: number): number {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  let d = rayonMax
  for (const seg of segments) {
    const sx = seg.b.x - seg.a.x
    const sy = seg.b.y - seg.a.y
    const denom = sx * dy - sy * dx
    if (Math.abs(denom) < 1e-9) continue
    const t = (sx * (seg.a.y - origine.y) - sy * (seg.a.x - origine.x)) / denom
    const u = (dx * (seg.a.y - origine.y) - dy * (seg.a.x - origine.x)) / denom
    if (t >= 0 && u >= 0 && u <= 1 && t < d) d = t
  }
  return d
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

describe('stress aléatoire : aucune arête large ne doit dépasser un mur', () => {
  for (let scenario = 0; scenario < 30; scenario++) {
    it(`scénario #${scenario}`, () => {
      const rand = seededRandom(scenario * 7919 + 1)
      const nbPoints = 4 + Math.floor(rand() * 8)
      const points: Point[] = []
      for (let i = 0; i < nbPoints; i++) {
        points.push({ x: rand() * 600, y: rand() * 600 })
      }
      const murs = [{ id: 'm', epaisseurM: 0.1, points }]
      const segments = mursEnSegments(murs)
      const origine: Point = { x: rand() * 600, y: rand() * 600 }
      const rayonMax = 150 + rand() * 200

      const polygone = polygoneVisibilite(origine, segments, rayonMax)

      let largesAnomalies = 0
      for (let i = 0; i < polygone.length; i++) {
        const p1 = polygone[i]!
        const p2 = polygone[(i + 1) % polygone.length]!
        const a1 = Math.atan2(p1.y - origine.y, p1.x - origine.x)
        const a2 = Math.atan2(p2.y - origine.y, p2.x - origine.x)
        let largeurAngle = Math.abs(a2 - a1)
        if (largeurAngle > Math.PI) largeurAngle = 2 * Math.PI - largeurAngle
        const largeurPx = largeurAngle * Math.max(distance(origine, p1), distance(origine, p2))
        if (largeurPx <= 1) continue // biseau trop fin pour être visible

        for (let f = 0.1; f < 1; f += 0.1) {
          const mx = p1.x + (p2.x - p1.x) * f
          const my = p1.y + (p2.y - p1.y) * f
          const angle = Math.atan2(my - origine.y, mx - origine.x)
          const distReelle = distance(origine, { x: mx, y: my })
          const distVraie = vraieDistance(origine, angle, segments, rayonMax)
          if (distReelle > distVraie + 1.5) largesAnomalies++
        }
      }
      expect(largesAnomalies).toBe(0)
    })
  }
})
