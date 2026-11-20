# Faunópolis v2.3 — gera as anatomias dos quadrúpedes no Blender e exporta js/animal_meshes.js
# Uso: abra o Blender (testado no 5.3), cole este arquivo no editor de texto e clique em "Executar".
# Tudo é criado na coleção "FaunoAnimais", sem mexer no restante da cena.
import bpy, bmesh, json, os
from mathutils import Vector

SAIDA = os.path.join(os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.path.expanduser('~'), 'animal_meshes.js')
K = 1 / 0.575   # metaballs do Blender saem com ~57,5% do tamanho pedido: compensa

col = bpy.data.collections.get('FaunoAnimais')
if not col:
    col = bpy.data.collections.new('FaunoAnimais'); bpy.context.scene.collection.children.link(col)
for o in list(col.objects):
    bpy.data.objects.remove(o, do_unlink=True)

def metaball_mesh(name, elems, res=0.035, thresh=0.6):
    mb = bpy.data.metaballs.new(name + '_mb'); mb.resolution = res; mb.render_resolution = res; mb.threshold = thresh
    for e in elems:
        if e[0] == 'e':
            el = mb.elements.new(type='ELLIPSOID'); el.co = e[1]; el.radius = 1.0
            el.size_x, el.size_y, el.size_z = (v * K for v in e[2]); el.stiffness = 2.0
        else:
            a, b = Vector(e[1]), Vector(e[2]); d = b - a
            el = mb.elements.new(type='CAPSULE'); el.co = (a + b) / 2; el.radius = e[3] * K
            el.size_x = d.length / 2; el.stiffness = 2.0
            el.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized())
    ob = bpy.data.objects.new(name + '_tmp', mb); col.objects.link(ob)
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob, do_unlink=True); bpy.data.metaballs.remove(mb)
    o = bpy.data.objects.new(name, me); col.objects.link(o)
    return o

def bake(ob, mod):
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old)

def finish(ob, voxel, tris):
    m = ob.modifiers.new('rm', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = voxel
    s = ob.modifiers.new('sm', 'SMOOTH'); s.iterations = 4; s.factor = 0.5
    bake(ob, None)
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.triangulate(bm, faces=bm.faces); n = len(bm.faces); bm.to_mesh(ob.data); bm.free()
    d = ob.modifiers.new('dc', 'DECIMATE'); d.ratio = min(1.0, tris / max(1, n)); d.use_collapse_triangulate = True
    bake(ob, None)

E = lambda c, s: ('e', c, s)
C = lambda a, b, r: ('c', a, b, r)
# x = frente (cabeça em +x), z = cima, y = lado. front/hind: topo da perna (x, z, y); head: (x, z, raio)
A = {
 'felino': dict(el=[E((0.80,0,1.38),(0.55,0.36,0.45)), E((0.05,0,1.38),(0.62,0.30,0.34)), E((-0.72,0,1.40),(0.50,0.34,0.42)), E((0.70,0,1.74),(0.32,0.24,0.14)), E((-0.66,0,1.70),(0.30,0.26,0.12)), C((1.10,0,1.58),(1.40,0,1.80),0.24), E((1.58,0,1.88),(0.30,0.27,0.27)), E((1.84,0,1.79),(0.16,0.18,0.14)), E((1.70,0,1.66),(0.15,0.16,0.08)), E((0.92,0,1.12),(0.28,0.26,0.20))],
   front=(0.80,1.05,0.22), hind=(-0.72,1.10,0.24), legR=(0.13,0.15), head=(1.58,1.88,0.30), tail=(-1.18,1.62), neckX=1.0, leg='paw', ref=(30,13)),
 'canideo': dict(el=[E((0.70,0,1.52),(0.48,0.28,0.42)), E((0.0,0,1.58),(0.55,0.22,0.26)), E((-0.68,0,1.55),(0.42,0.27,0.34)), E((0.62,0,1.88),(0.28,0.20,0.12)), C((0.95,0,1.68),(1.30,0,2.00),0.20), E((1.45,0,2.06),(0.24,0.21,0.21)), C((1.60,0,2.00),(1.98,0,1.93),0.10), E((1.72,0,1.90),(0.18,0.11,0.06)), E((0.85,0,1.22),(0.22,0.20,0.18))],
   front=(0.72,1.25,0.17), hind=(-0.68,1.28,0.18), legR=(0.10,0.12), head=(1.48,2.05,0.22), tail=(-1.05,1.72), neckX=0.95, leg='paw', ref=(22,8)),
 'cervideo': dict(el=[E((0.75,0,1.80),(0.46,0.32,0.40)), E((0.0,0,1.80),(0.60,0.32,0.36)), E((-0.72,0,1.86),(0.45,0.30,0.40)), E((-0.82,0,2.10),(0.30,0.26,0.12)), E((0.70,0,2.15),(0.26,0.20,0.12)), C((0.95,0,2.00),(1.35,0,2.75),0.17), E((1.42,0,2.88),(0.18,0.15,0.15)), C((1.42,0,2.85),(1.75,0,2.65),0.12), E((1.80,0,2.62),(0.11,0.10,0.09))],
   front=(0.72,1.55,0.18), hind=(-0.72,1.60,0.20), legR=(0.08,0.10), head=(1.50,2.82,0.17), tail=(-1.15,2.05), neckX=0.95, leg='hoof', ref=(28,12)),
 'equino': dict(el=[E((0.85,0,1.75),(0.52,0.36,0.48)), E((0.05,0,1.72),(0.62,0.36,0.42)), E((-0.75,0,1.80),(0.50,0.37,0.46)), E((0.85,0,2.15),(0.30,0.22,0.14)), E((-0.75,0,2.12),(0.36,0.30,0.14)), C((1.05,0,1.95),(1.40,0,2.55),0.26), C((0.95,0,2.15),(1.30,0,2.70),0.14), E((1.48,0,2.68),(0.20,0.17,0.18)), C((1.50,0,2.62),(1.95,0,2.25),0.13), E((1.97,0,2.20),(0.13,0.13,0.13))],
   front=(0.88,1.40,0.20), hind=(-0.78,1.45,0.21), legR=(0.10,0.13), head=(1.62,2.55,0.20), tail=(-1.22,2.10), neckX=1.05, leg='hoof', ref=(30,13)),
 'pesado': dict(el=[E((0.75,0,1.35),(0.62,0.55,0.62)), E((0.0,0,1.25),(0.75,0.58,0.62)), E((-0.80,0,1.35),(0.58,0.55,0.60)), E((0.70,0,1.85),(0.35,0.35,0.20)), C((1.10,0,1.40),(1.40,0,1.45),0.40), E((1.62,0,1.35),(0.38,0.34,0.33)), E((1.97,0,1.20),(0.22,0.30,0.22))],
   front=(0.75,0.85,0.36), hind=(-0.80,0.85,0.38), legR=(0.19,0.21), head=(1.65,1.35,0.34), tail=(-1.35,1.50), neckX=1.15, leg='hoof', ref=(36,20)),
 'urso': dict(el=[E((0.60,0,1.45),(0.60,0.50,0.58)), E((-0.05,0,1.40),(0.62,0.50,0.55)), E((-0.70,0,1.38),(0.52,0.48,0.52)), E((0.50,0,1.95),(0.38,0.36,0.20)), C((0.90,0,1.55),(1.25,0,1.60),0.32), E((1.42,0,1.62),(0.30,0.29,0.28)), E((1.72,0,1.52),(0.17,0.15,0.13))],
   front=(0.62,0.95,0.32), hind=(-0.70,0.95,0.32), legR=(0.17,0.19), head=(1.45,1.62,0.29), tail=(-1.18,1.45), neckX=0.95, leg='paw', ref=(34,17)),
 'pequeno': dict(el=[E((0.0,0,0.95),(1.00,0.42,0.50)), E((0.60,0,0.95),(0.45,0.40,0.45)), E((-0.60,0,0.98),(0.45,0.42,0.48)), C((0.95,0,1.00),(1.20,0,1.12),0.26), E((1.38,0,1.15),(0.30,0.27,0.27)), E((1.65,0,1.07),(0.16,0.16,0.13))],
   front=(0.60,0.60,0.26), hind=(-0.60,0.62,0.28), legR=(0.12,0.14), head=(1.40,1.15,0.28), tail=(-1.05,1.05), neckX=0.95, leg='paw', ref=(15,8)),
 'mustelideo': dict(el=[E((0.70,0,0.85),(0.45,0.26,0.30)), E((0.0,0,0.85),(0.60,0.24,0.28)), E((-0.70,0,0.85),(0.42,0.27,0.30)), C((1.00,0,0.92),(1.30,0,1.05),0.18), E((1.45,0,1.08),(0.22,0.19,0.17)), E((1.68,0,1.02),(0.12,0.12,0.10))],
   front=(0.70,0.55,0.17), hind=(-0.70,0.58,0.18), legR=(0.08,0.10), head=(1.47,1.08,0.20), tail=(-1.05,0.90), neckX=1.0, leg='paw', ref=(20,7)),
 'camelo': dict(el=[E((0.75,0,2.00),(0.45,0.34,0.42)), E((0.0,0,1.98),(0.60,0.33,0.38)), E((-0.72,0,2.00),(0.42,0.33,0.38)), E((0.30,0,2.40),(0.32,0.28,0.28)), E((-0.35,0,2.38),(0.30,0.27,0.26)), C((1.00,0,1.95),(1.45,0,1.80),0.16), C((1.45,0,1.80),(1.62,0,2.55),0.14), E((1.72,0,2.65),(0.22,0.13,0.14)), E((1.95,0,2.58),(0.13,0.11,0.11))],
   front=(0.75,1.80,0.18), hind=(-0.72,1.85,0.19), legR=(0.09,0.11), head=(1.75,2.63,0.15), tail=(-1.12,2.10), neckX=1.0, leg='hoof', ref=(32,12)),
 'girafa': dict(el=[E((0.60,0,2.35),(0.48,0.33,0.45)), E((0.0,0,2.20),(0.55,0.30,0.38)), E((-0.62,0,2.05),(0.40,0.30,0.36)), E((0.55,0,2.75),(0.28,0.22,0.15)), E((0.90,0,2.65),(0.25,0.22,0.30)), C((0.85,0,2.60),(1.45,0,4.30),0.17), E((1.50,0,4.48),(0.16,0.12,0.13)), C((1.50,0,4.45),(1.85,0,4.30),0.12), E((1.88,0,4.28),(0.10,0.09,0.09))],
   front=(0.62,2.05,0.20), hind=(-0.62,1.85,0.20), legR=(0.08,0.10), head=(1.60,4.42,0.14), tail=(-1.00,2.20), neckX=0.85, leg='hoof', ref=(30,13)),
}
LEGS = {
 'paw_f': [C((0,0,0),(0.02,0,-0.50),0.12), C((0.02,0,-0.50),(0,0,-0.92),0.085), E((0.06,0,-0.95),(0.12,0.10,0.05))],
 'paw_h': [C((0,0,0),(-0.10,0,-0.45),0.14), C((-0.10,0,-0.45),(0.02,0,-0.92),0.075), E((0.07,0,-0.95),(0.12,0.10,0.05))],
 'hoof_f': [C((0,0,0),(0,0,-0.50),0.10), C((0,0,-0.50),(0,0,-0.92),0.06), E((0.02,0,-0.96),(0.07,0.065,0.045))],
 'hoof_h': [C((0,0,0),(-0.12,0,-0.45),0.13), C((-0.12,0,-0.45),(-0.02,0,-0.92),0.055), E((0.0,0,-0.96),(0.07,0.065,0.045))],
}

def pack(me, scale):
    P = []
    for v in me.vertices:
        x, y, z = v.co
        P += [round(x * scale * 100), round(z * scale * 100), round(y * scale * 100)]   # Blender (x,y,z) -> jogo (x,z,y)
    I = []
    for p in me.polygons:
        vs = list(p.vertices)
        for k in range(1, len(vs) - 1):
            I += [vs[0], vs[k + 1], vs[k]]
    return {'p': P, 'i': I}

out = {'bodies': {}, 'legs': {}}
for i, (name, a) in enumerate(A.items()):
    ob = metaball_mesh(name, a['el']); finish(ob, 0.03, 2000); ob.location = ((i % 5) * 4.0, 8 + (i // 5) * 3.5, 0)
    d = pack(ob.data, 10)
    d['meta'] = {'front': [v * 10 for v in a['front']], 'hind': [v * 10 for v in a['hind']], 'legR': [v * 10 for v in a['legR']],
                 'head': [v * 10 for v in a['head']], 'tail': [v * 10 for v in a['tail']], 'neckX': a['neckX'] * 10, 'leg': a['leg'], 'ref': list(a['ref'])}
    out['bodies'][name] = d
for j, (name, el) in enumerate(LEGS.items()):
    ob = metaball_mesh('leg_' + name, el, res=0.02); finish(ob, 0.018, 320); ob.location = (j * 0.6, 4.5, 1.0)
    out['legs'][name] = pack(ob.data, 1)

with open(SAIDA, 'w', encoding='utf-8') as f:
    f.write('/* FAUNÓPOLIS — animal_meshes.js (gerado por scripts/blender/animais.py) */\nFP.AMESH = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print('Exportado:', SAIDA)
