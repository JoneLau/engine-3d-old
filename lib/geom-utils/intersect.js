import { mat3, vec3 } from '../vmath';
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
  let pt = vec3.zero();

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
  let ab = vec3.zero();

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
  let ab = vec3.zero();
  let ac = vec3.zero();
  let pvec = vec3.zero();
  let tvec = vec3.zero();
  let qvec = vec3.zero();

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
  let ab = vec3.zero();
  let ac = vec3.zero();
  let qp = vec3.zero();
  let ap = vec3.zero();
  let n = vec3.zero();
  let e = vec3.zero();

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
  let pq = vec3.zero();
  let pa = vec3.zero();
  let pb = vec3.zero();
  let pc = vec3.zero();
  let pd = vec3.zero();
  let m = vec3.zero();
  let tmp = vec3.zero();

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
  let e = vec3.zero();
  let c = vec3.zero();
  let o = vec3.zero();
  let d = vec3.zero();

  return function (ray, sphere, outPt) {
    let r = sphere.r;
    c = sphere.c;
    o = ray.o;
    d = ray.d;
    vec3.sub(e, c, o);
    let eLength = vec3.magnitude(e);

    //Projection formula: dot(a, b) / |b|
    let aLength = vec3.dot(e, d) / vec3.magnitude(d);
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
  let center = vec3.zero();
  let o = vec3.zero();
  let d = vec3.zero();
  let X = vec3.zero();
  let Y = vec3.zero();
  let Z = vec3.zero();
  let p = vec3.zero();
  let out = vec3.zero();
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

let box_point = (function () {
  let tmp = vec3.zero(), m3 = mat3.create();
  let lessThan = function(a, b) { return Math.abs(a.x) < b.x && Math.abs(a.y) < b.y && Math.abs(a.z) < b.z; };
  return function(box, point) {
    vec3.sub(tmp, point, box.center);
    vec3.transformMat3(tmp, tmp, mat3.transpose(m3, box.orientation));
    return lessThan(tmp, box.size);
  };
})();


/**
 * box-plane intersect
 *
 * @param {box} box
 * @param {plane} plane
 * @return {number} outside(front) = 0, intersect = -1, inside(back) = 1
 */
let box_plane = (function () {
  let absDot = function(n, x, y, z) {
    return Math.abs(n.x * x + n.y * y + n.z * z);
  };
  return function (box, plane) {
    // Real-Time Collision Detection, Christer Ericson, p. 163.
    let r = box.size.x * absDot(plane.n, box.orientation.m00, box.orientation.m01, box.orientation.m02) +
      box.size.y * absDot(plane.n, box.orientation.m03, box.orientation.m04, box.orientation.m05) +
      box.size.z * absDot(plane.n, box.orientation.m06, box.orientation.m07, box.orientation.m08);

    let dot = vec3.dot(plane.n, box.center);
    if (dot + r < plane.d) return 1;
    else if (dot - r > plane.d) return 0;
    return -1;
  };
})();

/**
 * box-frustum intersect, faster but has
 * false positive corner cases, read more here:
 * https://cesium.com/blog/2017/02/02/tighter-frustum-culling-and-why-you-may-want-to-disregard-it/
 *
 * @param {box} box
 * @param {planes: plane[], vertices: vec3[]} frustum
 * @return {boolean}
 */
let box_frustum = function (box, frustum) {
  for (let i = 0; i < frustum.planes.length; i++)
    // frustum plane normal points to the inside
    if (box_plane(box, frustum.planes[i]) == 1)
      return false; // completely outside
  return true;
};

/**
 * box-frustum intersect, handles most of the false positives correctly
 *
 * @param {box} box
 * @param {planes: plane[], vertices: vec3[]} frustum
 * @return {boolean}
 */
let box_frustum_accurate = (function () {
  let tmp = new Array(8), dist = 0, out1 = 0, out2 = 0;
  for (let i = 0; i < tmp.length; i++) tmp[i] = vec3.zero();
  let dot = function(n, x, y, z) {
    return n.x * x + n.y * y + n.z * z;
  };
  return function (cbox, frustum) {
    let result = 0, intersects = false;
    // 1. box inside/outside frustum test
    for (let i = 0; i < frustum.planes.length; i++) {
      result = box_plane(cbox, frustum.planes[i]);
      // frustum plane normal points to the inside
      if (result == 1) return false; // completely outside
      else if (result == -1) intersects = true;
    }
    if (!intersects) return true; // completely inside
    // in case of false positives
    // 2. frustum inside/outside box test
    for (let i = 0; i < frustum.vertices.length; i++)
      vec3.sub(tmp[i], frustum.vertices[i], cbox.center);
    out1 = 0, out2 = 0;
    for (let i = 0; i < frustum.vertices.length; i++) {
      dist = dot(tmp[i], cbox.orientation.m00, cbox.orientation.m01, cbox.orientation.m02);
      if (dist > cbox.size.x) out1++;
      else if (dist < -cbox.size.x) out2++;
    }
    if (out1 == frustum.vertices.length || out2 == frustum.vertices.length) return false;
    out1 = 0; out2 = 0;
    for (let i = 0; i < frustum.vertices.length; i++) {
      dist = dot(tmp[i], cbox.orientation.m03, cbox.orientation.m04, cbox.orientation.m05);
      if (dist > cbox.size.y) out1++;
      else if (dist < -cbox.size.y) out2++;
    }
    if (out1 == frustum.vertices.length || out2 == frustum.vertices.length) return false;
    out1 = 0; out2 = 0;
    for (let i = 0; i < frustum.vertices.length; i++) {
      dist = dot(tmp[i], cbox.orientation.m06, cbox.orientation.m07, cbox.orientation.m08);
      if (dist > cbox.size.z) out1++;
      else if (dist < -cbox.size.z) out2++;
    }
    if (out1 == frustum.vertices.length || out2 == frustum.vertices.length) return false;
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
    test[i] = vec3.zero();
  }

  let vertex = new Array(8);
  for (let i = 0; i < 8; i++) {
    vertex[i] = vec3.zero();
  }

  let i = vec3.zero();
  let a = vec3.zero();
  let p1 = vec3.zero();
  let p2 = vec3.zero();

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
 * sphere-plane intersect, not necessarily faster than box-plane
 * due to the length calculation of the plane normal to factor out
 * the unnomalized plane distance
 *
 * @param {sphere} sphere
 * @param {plane} plane
 * @return {number} outside(front) = 0, intersect = -1, inside(back) = 1
 */
let sphere_plane = function (sphere, plane) {
  let dot = vec3.dot(plane.n, sphere.c);
  let r = sphere.r * vec3.magnitude(plane.n);
  if (dot + r < plane.d) return 1;
  else if (dot - r > plane.d) return 0;
  return -1;
};

/**
 * sphere-frustum intersect, faster but has 
 * false positive corner cases, read more here:
 * https://stackoverflow.com/questions/20912692/view-frustum-culling-corner-cases
 *
 * @param {sphere} sphere
 * @param {planes: plane[], vertices: vec3[]} frustum
 * @return {boolean}
 */
let sphere_frustum = function (sphere, frustum) {
  for (let i = 0; i < frustum.planes.length; i++)
    // frustum plane normal points to the inside
    if (sphere_plane(sphere, frustum.planes[i]) == 1)
      return false; // completely outside
  return true;
};

/**
 * sphere-frustum intersect, handles the false positives correctly
 *
 * @param {sphere} sphere
 * @param {planes: plane[], vertices: vec3[]} frustum
 * @return {boolean}
 */
let sphere_frustum_accurate = (function () {
  let pt = vec3.zero(), map = [1, -1, 1, -1, 1, -1];
  let p = [], d = [];
  return function (sphere, frustum) {
    let intersects = false; p.length = 0; d.length = 0;
    for (let i = 0; i < frustum.planes.length; i++) {
      let dot = vec3.dot(frustum.planes[i].n, sphere.c);
      let dist = vec3.magnitude(frustum.planes[i].n);
      let r = sphere.r * dist; d.push(1 / dist);
      // frustum plane normal points to the inside
      if (dot + r < frustum.planes[i].d) return false; // completely outside
      else if (dot - r < frustum.planes[i].d) { intersects = true; p.push(i); }
    }
    if (!intersects) return true; // completely inside
    // in case of false positives
    for (let j = 0; j < p.length; j++) {
      // the most accurate solution would be to calculate 
      // the farthest intersection point away from each testing plane,
      // but the trade-off here is acceptable
      // for the corner cases are rare and generally negligible
      vec3.scale(pt, frustum.planes[p[j]].n, sphere.r * d[p[j]]);
      vec3.add(pt, sphere.c, pt);
      for (let i = 0; i < frustum.planes.length; i++) {
        if (i == p[j] || i == p[j] + map[i]) continue;
        if (vec3.dot(frustum.planes[i].n, pt) < frustum.planes[i].d) 
          return false;
      }
    }
    return true;
  };
})();

/**
 * sphere-sphere intersect
 *
 * @param {sphere} sphere0
 * @param {sphere} sphere1
 * @return {boolean}
 */
let sphere_sphere = (function () {
  let c0 = vec3.zero();
  let c1 = vec3.zero();

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
  let X = vec3.zero();
  let Y = vec3.zero();
  let Z = vec3.zero();
  let d = vec3.zero();
  let closestPoint = vec3.zero();
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
  box_point,
  box_plane,
  box_frustum,
  box_frustum_accurate,
  box_box,
  sphere_plane,
  sphere_frustum,
  sphere_frustum_accurate,
  sphere_sphere,
  sphere_box,
};