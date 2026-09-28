import json,re
def heb(n):
    ones=['','א','ב','ג','ד','ה','ו','ז','ח','ט']; tens=['','י','כ','ל','מ','נ','ס','ע','פ','צ']
    if n==15: s='טו'
    elif n==16: s='טז'
    else: s=tens[n//10]+ones[n%10]
    return s+"'" if len(s)==1 else s[:-1]+'"'+s[-1]
order=open('order.txt').read().split()
chapters=[];n=0
for key in order:
    lines=open(f'chapters/{key}.md',encoding='utf-8').read().split('\n')
    gate=None;title=None;blocks=[]
    for ln in lines:
        s=ln.strip()
        if not s: continue
        if s.startswith('# '): gate=s[2:]; continue
        if s.startswith('## '):
            title=s[3:].split('—',1)[1].strip(); continue
        if s=='---': blocks.append(['sep','']); continue
        if s.startswith('*') and s.endswith('*') and not s.startswith('**'):
            blocks.append(['place',s.strip('*')]); continue
        if s.startswith('**') and s.endswith('**'):
            blocks.append(['end',s.strip('*')]); continue
        blocks.append(['p',s])
    n+=1
    chapters.append({'num':heb(n),'n':n,'gate':gate,'title':title,'blocks':blocks,'key':key})
json.dump(chapters,open('build/book.json','w',encoding='utf-8'),ensure_ascii=False)
words=sum(len(b[1].split()) for c in chapters for b in c['blocks'])
print(n,'chapters',words,'words')
for c in chapters: print(c['n'],c['num'],c['title'],c['gate'] or '')
