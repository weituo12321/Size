import os, sys
from json import dumps, load

from os.path import join, getsize

dirs_dict = {}
ROOT_PATH = sys.argv[1]


def sizeFmt(num):
    for x in ['Bytes', 'KB', 'MB', 'GB', 'TB']:
        if num < 1024.0:
            return "%3.1f %s" % (num, x)
        num /= 1024.0

#for root, dirs, files in os.walk(ROOT_PATH, topdown = False):
#
#    size = sum(getsize(join(root, name)) for name in files)
#
#    subdir_size = sum(dirs_dict[join(root,d)] for d in dirs)
#
#    my_size = dirs_dict[root] = size + subdir_size
#
#    #print '%s : %s' % (root, my_size)
#
#for dir in dirs_dict:
#    dirs_dict[dir] = sizeFmt(dirs_dict[dir])
#    #print dir, dirs_dict[dir]
#

def generateD(path_to):
    cur = dict()
    num_files = 0
    size_cur = 0

    cur["name"] = path_to
    cur["children"] = list()
    cur["size"] = 0
    cur["num_files"] = 0

    for item in os.listdir(path_to):
        next_path = join(path_to, item)
        if os.path.isdir(next_path):
            child = generateD(next_path)
            cur["children"].append(child)
            cur["size"] += child["size"]
            cur["num_files"] = child["num_files"]
        if os.path.isfile(next_path):
            cur["size"] += getsize(next_path)
            cur["num_files"] += 1

    return cur

def generateDD(name, prefix=''):
    cur = dict()
    cur["name"] = name
    cur["children"] = list()
    cur["size"] = 0
    cur["num_files"] = 0

    if prefix:
        current_path = prefix + '/' + name
    else:
        current_path = name

    for item in os.listdir(current_path):
        next_path = join(current_path, item)
        if os.path.isdir(next_path):
            child = generateDD(item, current_path)
            cur["children"].append(child)
            cur["size"] += child["size"]
            cur["num_files"] += child["num_files"]
        if os.path.isfile(next_path):
            cur["size"] += getsize(next_path)
            cur["num_files"] += 1

    return cur


def generateD3(name, prefix= ''):
    cur = dict()
    cur["name"] = name
    cur["children"] = list()

    # generate current directory path
    if prefix:
        current_path = prefix + '/' + name
    else:
        current_path = name

    # iterate all the files in the current directory
    for item in os.listdir(current_path):
        next_path = join(current_path, item)
        if os.path.isdir(next_path):
            child = generateD3(item, current_path)
            cur["children"].append(child)
            """
            cur["size"] += child["size"]
            cur["num_files"] += child["num_files"]
            """
        if os.path.isfile(next_path):
            """
            cur["size"] += getsize(next_path)
            cur["num_files"] += 1
            """
            cur["children"].append({"name": item, "size": getsize(next_path)})

    return cur

#dirs_dict = generateD(ROOT_PATH)
#dirs_dict = generateDD(ROOT_PATH, "")
dirs_dict = generateD3(ROOT_PATH, "")
with open("test_file1.json", "w") as f:
    f.write(dumps(dirs_dict, f, indent=4))
