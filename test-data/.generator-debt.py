# Mock budget for someone with several bank accounts and debts: Visa, Afterpay, car loan, mortgage, ATO payment plan.
import json
n=[0]
def uid(p):
    n[0]+=1; return f"{p}{n[0]:04d}"
cats={}
def cat(name,parent=None,order=1,target=None,debtFor=None,kind=None,note=''):
    i=uid('c'); cats[i]=dict(id=i,name=name,parent=parent,order=order,hidden=False,target=target,note=note,kind=kind,linked=None,debtFor=debtFor); return i
mt=lambda a:{'type':'monthly','amount':a,'day':None,'due':None,'every':None,'by':None,'cap':None}
acc={}
def acct(name,typ,order,**k):
    i=uid('a'); acc[i]=dict(id=i,name=name,type=typ,closed=False,order=order,**k); return i
EV=acct('Everyday','checking',1); BL=acct('Bills account','checking',2); SV=acct('Savings','savings',3)
VI=acct('Visa','credit',4,rate=20.99,limit=600000,minPay=13000)
AP=acct('Afterpay','bnpl',5,payment=18000)
CL=acct('Car loan','loan',6,rate=8.5,payment=45000)
HL=acct('Home loan (mortgage)','loan',7,rate=6.24,payment=315000)
ATO=acct('ATO payment plan','loan',8,rate=11.43,payment=54167)
DG=cat('Debt payments',None,0,kind='save',note='Money set aside to pay your credit cards and loans. Spending on a card moves here by itself.')
pV=cat('Visa',DG,1,None,VI); pA=cat('Afterpay',DG,2,mt(18000),AP); pC=cat('Car loan',DG,3,mt(45000),CL)
pH=cat('Home loan (mortgage)',DG,4,mt(315000),HL); pT=cat('ATO payment plan',DG,5,mt(54167),ATO)
B=cat('Bills',None,1,kind='need'); power=cat('Electricity',B,1,mt(18000)); phone=cat('Phone',B,2,mt(6500)); ins=cat('Car insurance',B,3,mt(9500)); rates=cat('Council rates',B,4,mt(16000))
EvG=cat('Everyday',None,2,kind='need'); groc=cat('Groceries',EvG,1,mt(90000)); fuel=cat('Fuel',EvG,2,mt(28000)); kids=cat('Kids',EvG,3,mt(15000))
F=cat('Fun',None,3,kind='want'); eat=cat('Eating out',F,1,mt(20000)); cloth=cat('Clothes',F,2,mt(10000)); gifts=cat('Gifts',F,3,mt(8000))
S=cat('Savings goals',None,4,kind='save'); emerg=cat('Emergency fund',S,1,mt(20000)); tax=cat('Tax set aside',S,2,mt(40000),note='So next year\'s tax bill is already covered.')
tx={}
def T(acct,date,payee,amt,cat=None,transfer=None,cleared='c',memo=None):
    i=uid('t'); t=dict(id=i,acct=acct,date=date,payee=payee,cat=cat,amt=amt,bank=None,memo=memo,receipt=None,receiptType=None,cleared=cleared,approved=True,ik=None,transfer=transfer,pair=None,splits=None,by=None,ts=1,match=None,posted=None,iks=None,imp=None,impd=None,notWith=None)
    tx.setdefault(date[:7],{'t':{}})['t'][i]=t; return t
def X(a,b,date,amt,payee=None):
    t1=T(a,date,payee,-amt,transfer=b); t2=T(b,date,payee,amt,transfer=a); t1['pair']=t2['id']; t2['pair']=t1['id']
owe={HL:48500000,ATO:1864000,CL:1450000}
T(EV,'2026-08-01','Starting balance',240000,'_income',cleared='r'); T(BL,'2026-08-01','Starting balance',320000,'_income',cleared='r'); T(SV,'2026-08-01','Starting balance',500000,'_income',cleared='r')
T(VI,'2026-08-01','Starting balance',-320000,'_start',cleared='r'); T(AP,'2026-08-01','Starting balance',-36000,'_start',cleared='r')
for a in (CL,HL,ATO): T(a,'2026-08-01','Starting balance',-owe[a],'_start',cleared='r')
rate={CL:8.5,HL:6.24,ATO:11.43}
months={}
for m in ['2026-08','2026-09','2026-10']:
    for d in (['03','17'] if m!='2026-10' else ['01']): T(EV,f'{m}-{d}','Employer pay',520000,'_income')
    if m!='2026-10':
        X(EV,BL,f'{m}-02',520000,'Bills top-up')
        X(BL,HL,f'{m}-01',315000,'Home loan repayment')
        X(EV,ATO,f'{m}-07',25000,'ATO instalment'); X(EV,ATO,f'{m}-21',25000,'ATO instalment')
        X(BL,CL,f'{m}-15',45000,'Car loan repayment')
        for a,p in ((HL,'Interest'),(CL,'Interest'),(ATO,'General interest charge')):
            i=int(round(owe[a]*rate[a]/1200)); T(a,f'{m}-28',p,-i,{HL:pH,CL:pC,ATO:pT}[a]); owe[a]+=i
        owe[HL]-=315000; owe[CL]-=45000; owe[ATO]-=50000
        T(BL,f'{m}-12','Origin Energy',-17150 if m=='2026-08' else -19320,power); T(BL,f'{m}-19','Telstra',-6500,phone); T(BL,f'{m}-21','AAMI',-9500,ins)
        X(EV,AP,f'{m}-08',9000,'Afterpay instalment'); X(EV,AP,f'{m}-22',9000,'Afterpay instalment')
        for d,p,a,c in [('04','Woolworths',-18450,groc),('09','Coles',-21230,groc),('16','Aldi',-15475,groc),('24','Woolworths',-19860,groc),('06','Ampol',-7200,fuel),('20','BP',-6850,fuel),('11','Guzman y Gomez',-4890,eat),('26','Kmart',-6400,kids)]:
            T(VI,f'{m}-{d}',p,a,c,cleared='c' if m=='2026-08' else 'u')
        T(VI,f'{m}-27','Interest charged',-5400,pV)
        X(EV,VI,f'{m}-28',60000,'Visa payment')
        T(EV,f'{m}-13','Cotton On',-5995,cloth); T(EV,f'{m}-18','Hungry Jacks',-2340,eat)
    else:
        T(VI,'2026-10-02','Woolworths',-17320,groc,cleared='u'); T(AP,'2026-10-02','Myer (Afterpay)',-24000,cloth,cleared='u',memo='4 payments of $60')
        X(BL,HL,'2026-10-01',315000,'Home loan repayment')
    asg={power:18000,phone:6500,ins:9500,rates:16000,groc:90000,fuel:28000,kids:15000,eat:20000,cloth:10000,gifts:8000,emerg:20000,tax:40000,pA:18000,pC:45000,pV:20000,pH:315000,pT:54167}
    if m=='2026-10': asg={groc:90000,pH:315000,pC:45000,pA:18000}
    months[m]={'assigned':asg,'moves':{}}
backup={'app':'zero-line','version':1,'exportedAt':'2026-10-03T10:00:00.000Z','data':{'meta':{'cats':{'items':cats},'accounts':{'items':acc},'rules':{'items':{}},'imports':{'items':{}},'settings':{'currency':'AUD'}},'months':months,'tx':tx}}
json.dump(backup,open('mock-budget-debt-backup.json','w'),indent=1,ensure_ascii=False)
print('tx', sum(len(v['t']) for v in tx.values()), 'owing', {acc[k]['name']:v/100 for k,v in owe.items()})
