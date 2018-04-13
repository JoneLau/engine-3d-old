import { vec3 } from 'vmath';
import distance from './distance';

/**
 * ray-plane intersect
 *
 * @param {ray} ray
 * @param {plane} plane
 * @param {vec3} outPt the intersect point if provide
 * @return {boolean}
 */
let ray_plane = (function () {
  let pt = vec3.create();

  return function (ray, plane, outPt) {
    distance.pt_point_plane(pt, ray.o, plane);
    let t = vec3.dot(pt, plane.n) / vec3.dot(ray.d, plane.n);
    let intersects = t >= 0;

    if (outPt && intersects) {
      vec3.scale(outPt, ray.d, t);
      vec3.add(outPt, outPt, ray.o);
    }

    return intersects;
  };
})();

/**
 * line-plane intersect
 *
 * @param {line} line
 * @param {plane} plane
 * @param {vec3} outPt the intersect point if provide
 * @return {boolean}
 */
let line_plane = (function () {
  let ab = vec3.create();

  return function (line, plane, outPt) {
    vec3.sub(ab, line.e, line.s);
    let t = (plane.d - vec3.dot(line.s, plane.n)) / vec3.dot(ab, plane.n);
    let intersects = t >= 0 && t <= 1.0;

    if (outPt && intersects) {
      vec3.scale(outPt, ab, t);
      vec3.add(outPt, outPt, line.s);
    }

    return intersects;
  };
})();

/**
 * ray-triangle intersect
 *
 * @param {ray} ray
 * @param {triangle} triangle
 * @param {vec3} outPt the intersect point if provide
 * @return {boolean}
 */
let ray_triangle = (function () {
  let ab = vec3.create();
  let ac = vec3.create();
  let pvec = vec3.create();
  let tvec = vec3.create();
  let qvec = vec3.create();

  return function (ray, triangle, outPt) {
    vec3.sub(ab, triangle.b, triangle.a);
    vec3.sub(ac, triangle.c, triangle.a);

    vec3.cross(pvec, ray.d, ac);
    let det = vec3.dot(ab, pvec);

    if (det <= 0) {
      return false;
    }

    vec3.sub(tvec, ray.o, triangle.a);
    let u = vec3.dot(tvec, pvec);
    if (u < 0 || u > det) {
      return false;
    }

    vec3.cross(qvec, tvec, ab);
    let v = vec3.dot(ray.d, qvec);
    if (v < 0 || u + v > det) {
      return false;
    }

    if (outPt) {
      let t = vec3.dot(ac, qvec) / det;
      vec3.scaleAndAdd(outPt, ray.o, ray.d, t);
    }

    return true;
  };
})();

/**
 * line-triangle intersect
 *
 * @param {line} line
 * @param {triangle} triangle
 * @param {vec3} outPt the intersect point if provide
 * @return {boolean}
 */
let line_triangle = (function () {
  let ab = vec3.create();
  let ac = vec3.create();
  let qp = vec3.create();
  let ap = vec3.create();
  let n = vec3.create();
  let e = vec3.create();

  return function (line, triangle, outPt) {
    vec3.sub(ab, triangle.b, triangle.a);
    vec3.sub(ac, triangle.c, triangle.a);
    vec3.sub(qp, line.s, line.e);

    vec3.cross(n, ab, ac);
    let det = vec3.dot(qp, n);

    if (det <= 0.0) {
      return false;
    }

    vec3.sub(ap, line.s, triangle.a);
    let t = vec3.dot(ap, n);
    if (t < 0 || t > det) {
      return false;
    }

    vec3.cross(e, qp, ap);
    let v = vec3.dot(ac, e);
    if (v < 0 || v > det) {
      return false;
    }

    let w = -vec3.dot(ab, e);
    if (w < 0.0 || v + w > det) {
      return false;
    }

    if (outPt) {
      let invDet = 1.0 / det;
      v *= invDet;
      w *= invDet;
      let u = 1.0 - v - w;

      // outPt = u*a + v*d + w*c;
      vec3.set(outPt,
        triangle.a.x * u + triangle.b.x * v + triangle.c.x * w,
        triangle.a.y * u + triangle.b.y * v + triangle.c.y * w,
        triangle.a.z * u + triangle.b.z * v + triangle.c.z * w
      );
    }

    return true;
  };
})();

/**
 * ray-quad intersect
 *
 * @param {vec3} p
 * @param {vec3} q
 * @param {vec3} a
 * @param {vec3} b
 * @param {vec3} c
 * @param {vec3} d
 * @param {vec3} outPt the intersect point if provide
 * @return {boolean}
 */
let line_quad = (function () {
  let pq = vec3.create();
  let pa = vec3.create();
  let pb = vec3.create();
  let pc = vec3.create();
  let pd = vec3.create();
  let m = vec3.create();
  let tmp = vec3.create();

  return function (p, q, a, b, c, d, outPt) {
    vec3.sub(pq, q, p);
    vec3.sub(pa, a, p);
    vec3.sub(pb, b, p);
    vec3.sub(pc, c, p);

    // Determine which triangle to test against by testing against diagonal first
    vec3.cross(m, pc, pq);
    let v = vec3.dot(pa, m);

    if (v >= 0) {
      // Test intersection against triangle abc
      let u = -vec3.dot(pb, m);
      if (u < 0) {
        return false;
      }

      let w = vec3.dot(vec3.cross(tmp, pq, pb), pa);
      if (w < 0) {
        return false;
      }

      // outPt = u*a + v*b + w*c;
      if (outPt) {
        let denom = 1.0 / (u + v + w);
        u *= denom;
        v *= denom;
        w *= denom;

        vec3.set(outPt,
          a.x * u + b.x * v + c.x * w,
          a.y * u + b.y * v + c.y * w,
          a.z * u + b.z * v + c.z * w
        );
      }
    } else {
      // Test intersection against triangle dac
      vec3.sub(pd, d, p);

      let u = vec3.dot(pd, m);
      if (u < 0) {
        return false;
      }

      let w = vec3.dot(vec3.cross(tmp, pq, pa), pd);
      if (w < 0) {
        return false;
      }

      // outPt = u*a + v*d + w*c;
      if (outPt) {
        v = -v;

        let denom = 1.0 / (u + v + w);
        u *= denom;
        v *= denom;
        w *= denom;

        vec3.set(outPt,
          a.x * u + d.x * v + c.x * w,
          a.y * u + d.y * v + c.y * w,
          a.z * u + d.z * v + c.z * w
        );
      }
    }

    return true;
  };
})();

/**
 * ray-sphere intersect
 *
 * @param {ray} ray
 * @param {sphere} sphere
 * @param {vec3} outPt the intersect point if provide
 * @return {boolean}
 */
let ray_sphere = (function () {
  let e = vec3.create();
  let c = vec3.create();
  let o = vec3.create();
  let d = vec3.create();

  return function (ray, sphere, outPt) {
    let r = sphere.r;
    c = sphere.c;
    o = ray.o;
    d = ray.d;
    vec3.sub(e, c, o);
    let eLength = vec3.length(e);

    //Projection formula: dot(a, b) / |b|
    let aLength = vec3.dot(e, d) / vec3.length(d);
    let f = Math.sqrt(sphere.r * sphere.r - (eLength * eLength - aLength * aLength));
    let t = aLength - f;

    if (f < 0 || t < 0 || eLength < sphere.r) {
      return false;
    }

    vec3.scale(outPt, e, (eLength - r) / eLength);

    return true;
  };
})();

/**
 * ray-box intersect
 *
 * @param {ray} ray
 * @param {box} box
 * @param {vec3} outPt the intersect point if provide
 * @return {boolean}
 */
let ray_box = (function () {
  let center = vec3.create();
  let o = vec3.create();
  let d = vec3.create();
  let X = vec3.create();
  let Y = vec3.create();
  let Z = vec3.create();
  let p = vec3.create();
  let out = vec3.create();
  let size = new Array(3);
  let f = new Array(3);
  let e = new Array(3);
  let t = new Array(6);

  return function (ray, box, outPt) {
    size[0] = box.size.x;
    size[1] = box.size.y;
    size[2] = box.size.z;
    center = box.center;
    o = ray.o;
    d = ray.d;

    vec3.set(X, box.orientation.m00, box.orientation.m01, box.orientation.m02);
    vec3.set(Y, box.orientation.m03, box.orientation.m04, box.orientation.m05);
    vec3.set(Z, box.orientation.m06, box.orientation.m07, box.orientation.m08);
    vec3.sub(p, center, o);

    //The cos values of the ray on the X, Y, Z
    f[0] = vec3.dot(X, d);
    f[1] = vec3.dot(Y, d);
    f[2] = vec3.dot(Z, d);

    //The projection length of P on X, Y, Z
    e[0] = vec3.dot(X, p);
    e[1] = vec3.dot(Y, p);
    e[2] = vec3.dot(Z, p);

    for (let i = 0; i < 3; ++i) {
      if (f[i] === 0) {
        if (-e[i] - size[i] > 0 || -e[i] + size[i] < 0) {
          return false;
        }
        // Avoid div by 0!
        f[i] = 0.0000001;
      }
      // min
      t[i * 2 + 0] = (e[i] + size[i]) / f[i];
      // max
      t[i * 2 + 1] = (e[i] - size[i]) / f[i];
    }
    let tmin = Math.max(
      Math.max(
        Math.min(t[0], t[1]),
        Math.min(t[2], t[3])),
      Math.min(t[4], t[5])
    );
    let tmax = Math.min(
      Math.min(
        Math.max(t[0], t[1]),
        Math.max(t[2], t[3])),
      Math.max(t[4], t[5])
    );
    if (tmax < 0 || tmin > tmax || tmin < 0) {
      return false;
    }

    vec3.set(out, tmin * f[0] + o.x, tmin * f[1] + o.y, tmin * f[2] + o.z);
    vec3.transformMat3(outPt, out, box.orientation);

    return true;
  };
})();

/**
 * box-box intersect
 *
 * @param {box} box
 * @return {boolean}
 */
let box_box = (function () {
  let test = new Array(15);
  for (let i = 0; i < 15; i++) {
    test[i] = vec3.create();
  }

  let vertex = new Array(8);
  for (let i = 0; i < 8; i++) {
    vertex[i] = vec3.create();
  }

  let i = vec3.create();
  let a = vec3.create();
  let p1 = vec3.create();
  let p2 = vec3.create();

  return function (box0, box1) {
    vec3.set(test[0], box0.orientation.m00, box0.orientation.m01, box0.orientation.m02);
    vec3.set(test[1], box0.orientation.m03, box0.orientation.m04, box0.orientation.m05);
    vec3.set(test[2], box0.orientation.m06, box0.orientation.m07, box0.orientation.m08);
    vec3.set(test[3], box1.orientation.m00, box1.orientation.m01, box1.orientation.m02);
    vec3.set(test[4], box1.orientation.m03, box1.orientation.m04, box1.orientation.m05);
    vec3.set(test[5], box1.orientation.m06, box1.orientation.m07, box1.orientation.m08);

    // Fill out rest of axis
    for (let i = 0; i < 3; ++i) {
      vec3.cross(test[6 + i * 3 + 0], test[i], test[0]);
      vec3.cross(test[6 + i * 3 + 1], test[i], test[1]);
      vec3.cross(test[6 + i * 3 + 1], test[i], test[2]);
    }

    // Seperating axis found
    for (let i = 0; i < 15; ++i) {

      if (!overlapOnAxis(box0, box1, test[i])) {
        return false;
      }
    }

    return true;

    function overlapOnAxis(box0, box1, axis) {

      let MIN = 0;
      let MAX = 1;
      let interval_0 = getInterval(box0, axis);
      let interval_1 = getInterval(box1, axis);

      return ((interval_1[MIN] <= interval_0[MAX]) && (interval_0[MIN] <= interval_1[MAX]));
    }

    function getInterval(box, axis) {

      vec3.add(p1, box.center, box.size);
      vec3.sub(p2, box.center, box.size);

      //Get min
      vec3.set(i, Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.min(p1.z, p2.z));

      //Get max
      vec3.set(a, Math.max(p1.x, p2.x), Math.max(p1.y, p2.y), Math.max(p1.z, p2.z));

      vec3.set(vertex[0], i.x, a.y, a.z);
      vec3.set(vertex[1], i.x, a.y, i.z);
      vec3.set(vertex[2], i.x, i.y, a.z);
      vec3.set(vertex[3], i.x, i.y, i.z);
      vec3.set(vertex[4], a.x, a.y, a.z);
      vec3.set(vertex[5], a.x, a.y, i.z);
      vec3.set(vertex[6], a.x, i.y, a.z);
      vec3.set(vertex[7], a.x, i.y, i.z);

      let min = 0;
      let max = 0;
      min = max = vec3.dot(axis, vertex[0]);

      for (let i = 1; i < 8; ++i) {
        let projection = vec3.dot(axis, vertex[i]);
        min = (projection < min) ?
          projection : min;
        max = (projection > max) ?
          projection : max;
      }
      let result = [min, max];

      return result;
    }
  };
})();


/**
 * sphere-sphere intersect
 *
 * @param {sphere} sphere
 * @return {boolean}
 */
let sphere_sphere = (function () {
  let c0 = vec3.create();
  let c1 = vec3.create();

  return function (sphere0, sphere1) {
    let r0 = sphere0.r;
    let r1 = sphere1.r;
    c0 = sphere0.c;
    c1 = sphere1.c;
    let distance = vec3.distance(c0, c1);

    if (distance > (r0 + r1)) {
      return false;
    }
    else return true;
  };
})();

/**
 * box-sphere intersect
 *
 * @param {sphere} sphere
 * @param {box} box
 * @return {boolean}
 */

let sphere_box = (function () {
  let X = vec3.create();
  let Y = vec3.create();
  let Z = vec3.create();
  let d = vec3.create();
  let closestPoint = vec3.create();
  let u = new Array(3);
  let e = new Array(3);

  return function (sphere, box) {
    vec3.set(X, box.orientation.m00, box.orientation.m01, box.orientation.m02);
    vec3.set(Y, box.orientation.m03, box.orientation.m04, box.orientation.m05);
    vec3.set(Z, box.orientation.m06, box.orientation.m07, box.orientation.m08);

    u[0] = X;
    u[1] = Y;
    u[2] = Z;
    e[0] = box.size.x;
    e[1] = box.size.y;
    e[2] = box.size.z;

    vec3.sub(d, sphere.c, box.center);

    //Start result at center of box; make steps from there
    vec3.set(closestPoint, box.center.x, box.center.y, box.center.z);

    //For each OBB axis...
    for (let i = 0; i < 3; i++) {

      //...project d onto that axis to get the distance
      //along the axis of d from the box center
      let dist = vec3.dot(d, u[i]);

      //if distance farther than the box extents, clamp to the box
      if (dist > e[i]) {
        dist = e[i];
      }
      if (dist < -e[i]) {
        dist = -e[i];
      }

      //Step that distance along the axis to get world coordinate
      closestPoint.x += dist * u[i].x;
      closestPoint.y += dist * u[i].y;
      closestPoint.z += dist * u[i].z;
    }

    let dist = vec3.distance(closestPoint, sphere.c);

    return dist < sphere.r;
  };
})();

/**
 * @name intersect
 */
export default {
  ray_plane,
  line_plane,
  ray_triangle,
  line_triangle,
  line_quad,
  ray_sphere,
  ray_box,
  box_box,
  sphere_sphere,
  sphere_box,
};