"use client";

import { useEffect, useRef } from "react";

interface TessellationBackgroundProps {
  className?: string;
}

export default function TessellationBackground({ className = "" }: TessellationBackgroundProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const EPSILON = 1.0 / 1048576.0;

    // Delaunay Triangulation Implementation
    function getSuperT(vertices: number[][]) {
      let xMin = Number.POSITIVE_INFINITY,
        yMin = Number.POSITIVE_INFINITY,
        xMax = Number.NEGATIVE_INFINITY,
        yMax = Number.NEGATIVE_INFINITY;

      for (let i = vertices.length; i--; ) {
        if (vertices[i][0] < xMin) xMin = vertices[i][0];
        if (vertices[i][0] > xMax) xMax = vertices[i][0];
        if (vertices[i][1] < yMin) yMin = vertices[i][1];
        if (vertices[i][1] > yMax) yMax = vertices[i][1];
      }

      const xDiff = xMax - xMin;
      const yDiff = yMax - yMin;
      const maxDiff = Math.max(xDiff, yDiff);
      const xCenter = xMin + xDiff * 0.5;
      const yCenter = yMin + yDiff * 0.5;

      return [
        [xCenter - 20 * maxDiff, yCenter - maxDiff],
        [xCenter, yCenter + 20 * maxDiff],
        [xCenter + 20 * maxDiff, yCenter - maxDiff],
      ];
    }

    function circumcircle(vertices: number[][], i: number, j: number, k: number) {
      const xI = vertices[i][0],
        yI = vertices[i][1],
        xJ = vertices[j][0],
        yJ = vertices[j][1],
        xK = vertices[k][0],
        yK = vertices[k][1],
        yDiffIJ = Math.abs(yI - yJ),
        yDiffJK = Math.abs(yJ - yK);

      if (yDiffIJ < EPSILON && yDiffJK < EPSILON)
        throw new Error("Can't get circumcircle since all 3 points are y-aligned");

      const m1 = -((xJ - xI) / (yJ - yI));
      const m2 = -((xK - xJ) / (yK - yJ));
      const xMidIJ = (xI + xJ) / 2.0;
      const xMidJK = (xJ + xK) / 2.0;
      const yMidIJ = (yI + yJ) / 2.0;
      const yMidJK = (yJ + yK) / 2.0;
      const xCenter =
        yDiffIJ < EPSILON
          ? xMidIJ
          : yDiffJK < EPSILON
          ? xMidJK
          : (m1 * xMidIJ - m2 * xMidJK + yMidJK - yMidIJ) / (m1 - m2);
      const yCenter =
        yDiffIJ > yDiffJK ? m1 * (xCenter - xMidIJ) + yMidIJ : m2 * (xCenter - xMidJK) + yMidJK;
      const xDiff = xJ - xCenter;
      const yDiff = yJ - yCenter;

      return { i, j, k, x: xCenter, y: yCenter, r: xDiff * xDiff + yDiff * yDiff };
    }

    function dedupeEdges(edges: number[]) {
      for (let j = edges.length; j; ) {
        const b = edges[--j];
        const a = edges[--j];
        for (let i = j; i; ) {
          const n = edges[--i];
          const m = edges[--i];
          if ((a === m && b === n) || (a === n && b === m)) {
            edges.splice(j, 2);
            edges.splice(i, 2);
            break;
          }
        }
      }
    }

    function calcDelaunayTriangulation(vertices: number[][]): number[] {
      const n = vertices.length;
      if (n < 3 || n > 2000) return [];

      vertices = vertices.slice(0);
      const indices = new Array(n);

      for (let i = n; i--; ) indices[i] = i;

      indices.sort((i, j) => vertices[j][0] - vertices[i][0]);

      const st = getSuperT(vertices);
      vertices.push(st[0], st[1], st[2]);

      const candidates = [circumcircle(vertices, n + 0, n + 1, n + 2)];
      const locked: any[] = [];
      const edges: number[] = [];

      for (let i = indices.length; i--; edges.length = 0) {
        const c = indices[i];

        for (let j = candidates.length; j--; ) {
          const dx = vertices[c][0] - candidates[j].x;
          if (dx > 0.0 && dx * dx > candidates[j].r) {
            locked.push(candidates[j]);
            candidates.splice(j, 1);
            continue;
          }

          const dy = vertices[c][1] - candidates[j].y;
          if (dx * dx + dy * dy - candidates[j].r > EPSILON) continue;

          edges.push(
            candidates[j].i,
            candidates[j].j,
            candidates[j].j,
            candidates[j].k,
            candidates[j].k,
            candidates[j].i
          );
          candidates.splice(j, 1);
        }

        dedupeEdges(edges);
        for (let j = edges.length; j; ) {
          const b = edges[--j];
          const a = edges[--j];
          candidates.push(circumcircle(vertices, a, b, c));
        }
      }

      for (let i = candidates.length; i--; ) locked.push(candidates[i]);

      const triangleIndices: number[] = [];
      for (let i = locked.length; i--; )
        if (locked[i].i < n && locked[i].j < n && locked[i].k < n)
          triangleIndices.push(locked[i].i, locked[i].j, locked[i].k);

      return triangleIndices;
    }

    // Tesselation
    const svgW = 1600;
    const svgH = 600;
    let prevGroup: SVGGElement | null = null;

    function createRandomTesselation() {
      const wW = window.innerWidth;
      const wH = window.innerHeight;
      const gridSpacing = 50; // Reduced from 100 to 50 for smaller triangles
      const scatterAmount = 0.75;

      const gridSize =
        wW / wH > svgW / svgH
          ? gridSpacing * (svgW / wW)
          : gridSpacing * (svgH / wH);

      const vertices: number[][] = [];
      const xOffset = (svgW % gridSize) / 2;
      const yOffset = (svgH % gridSize) / 2;

      for (let x = Math.floor(svgW / gridSize) + 1; x >= -1; x--) {
        for (let y = Math.floor(svgH / gridSize) + 1; y >= -1; y--) {
          vertices.push([
            xOffset + gridSize * (x + scatterAmount * (Math.random() - 0.5)),
            yOffset + gridSize * (y + scatterAmount * (Math.random() - 0.5)),
          ]);
        }
      }

      const triangles = calcDelaunayTriangulation(vertices);
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

      for (let i = triangles.length; i; ) {
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const idx1 = triangles[--i] as number;
        const idx2 = triangles[--i] as number;
        const idx3 = triangles[--i] as number;
        polygon.setAttribute(
          "points",
          vertices[idx3][0] +
            "," +
            vertices[idx3][1] +
            " " +
            vertices[idx2][0] +
            "," +
            vertices[idx2][1] +
            " " +
            vertices[idx1][0] +
            "," +
            vertices[idx1][1]
        );
        polygon.setAttribute("fill", "white");
        polygon.setAttribute("stroke", "none");
        polygon.style.opacity = "0";
        group.appendChild(polygon);
      }

      return group;
    }

    function animateNext(duration: number) {
      const t = duration / 1000;

      // Fade out previous
      if (prevGroup && prevGroup.children && prevGroup.children.length) {
        const toRemove = prevGroup;
        const n = toRemove.children.length;
        for (let i = n; i--; ) {
          const child = toRemove.children[i] as HTMLElement;
          setTimeout(() => {
            child.style.transition = `opacity ${t * 0.4}s`;
            child.style.opacity = "0";
          }, t * 300 * (i / n));
        }
        setTimeout(
          () => {
            if (svg && toRemove.parentNode === svg) {
              svg.removeChild(toRemove);
            }
          },
          t * (700 + 50)
        );
      }

      // Fade in new
      const g = createRandomTesselation();
      const n = g.children.length;
      for (let i = n; i--; ) {
        const child = g.children[i] as HTMLElement;
        setTimeout(() => {
          child.style.transition = `opacity ${t * 0.4}s ease-out`;
          child.style.opacity = String(0.7 + 0.3 * Math.random()); // Increased from 0.5-0.85 to 0.7-1.0 for more prominent effect
        }, t * (300 * (i / n) + 300));
      }
      svg!.appendChild(g);
      prevGroup = g;
    }

    // Gradient colors
    const colors = [
      "#3c6df0",
      "#12a3b4",
      "#00a78f",
      "#00aa5e",
      "#81b532",
      "#e3bc13",
      "#ffb000",
      "#fe8500",
      "#fe6100",
      "#e62325",
      "#dc267f",
      "#c22dd5",
      "#9753e1",
      "#5a3ec8",
    ];

    const rect1 = svg.querySelector("#rect1") as SVGRectElement;
    const rect2 = svg.querySelector("#rect2") as SVGRectElement;
    const stop1a = svg.querySelector("#stop1a") as SVGStopElement;
    const stop1b = svg.querySelector("#stop1b") as SVGStopElement;
    const stop2a = svg.querySelector("#stop2a") as SVGStopElement;
    const stop2b = svg.querySelector("#stop2b") as SVGStopElement;

    let showingGrad1 = false;
    rect1.style.opacity = "0";
    rect2.style.opacity = "0";

    function assignRandomColors(stopA: SVGStopElement, stopB: SVGStopElement) {
      const rA = Math.floor(colors.length * Math.random());
      let rB = Math.floor(Math.random() * 3) + 3;
      rB = (rA + (rB * (Math.random() < 0.5 ? -1 : 1)) + colors.length) % colors.length;
      stopA.setAttribute("stop-color", colors[rA]);
      stopB.setAttribute("stop-color", colors[rB]);
    }

    function animateGradients(duration: number) {
      const t = duration / 1000;
      const hideRect = showingGrad1 ? rect1 : rect2;
      const showRect = showingGrad1 ? rect2 : rect1;
      const showStopA = showingGrad1 ? stop2a : stop1a;
      const showStopB = showingGrad1 ? stop2b : stop1b;

      showingGrad1 = !showingGrad1;

      setTimeout(() => {
        hideRect.style.transition = `opacity ${0.55 * t}s ease-out`;
        hideRect.style.opacity = "0";
      }, 0.2 * t * 1000);

      assignRandomColors(showStopA, showStopB);
      showRect.style.transition = `opacity ${0.65 * t}s ease-in`;
      showRect.style.opacity = "1";
    }

    // Animation loop
    let lastTransitionAt = 0;
    const transitionDelay = 5500;
    const transitionDuration = 3000;

    function tick(time: number) {
      if (!lastTransitionAt || time - lastTransitionAt > transitionDelay) {
        lastTransitionAt = time;
        animateNext(transitionDuration);
        animateGradients(transitionDuration);
      }
      requestAnimationFrame(tick);
    }

    // Initial animation
    animateGradients(transitionDuration);
    animateNext(transitionDuration);
    requestAnimationFrame(tick);

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1600 600"
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ mixBlendMode: "lighten" }}
    >
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="0" colorInterpolation="sRGB">
          <stop id="stop1a" offset="0%" stopColor="#12a3b4" />
          <stop id="stop1b" offset="100%" stopColor="#ff509e" />
        </linearGradient>
        <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="0" colorInterpolation="sRGB">
          <stop id="stop2a" offset="0%" stopColor="#e3bc13" />
          <stop id="stop2b" offset="100%" stopColor="#00a78f" />
        </linearGradient>
        <filter id="grainy">
          <feTurbulence type="fractalNoise" baseFrequency="3.5" numOctaves={8} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="2.5" intercept="-0.75" />
            <feFuncG type="linear" slope="2.5" intercept="-0.75" />
            <feFuncB type="linear" slope="2.5" intercept="-0.75" />
          </feComponentTransfer>
          <feBlend mode="overlay" in2="SourceGraphic" />
        </filter>
      </defs>
      <rect id="rect1" x="0" y="0" width="1600" height="600" stroke="none" fill="url(#grad1)" filter="url(#grainy)" />
      <rect id="rect2" x="0" y="0" width="1600" height="600" stroke="none" fill="url(#grad2)" filter="url(#grainy)" />
    </svg>
  );
}
