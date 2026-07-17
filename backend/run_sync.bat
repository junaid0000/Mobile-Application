@echo off
echo Mapping network drive...
net use Z: \\192.168.12.250\Agenda_Vendita
cd C:\Users\JunaidMunir.Janjua\Desktop\Mobile-Application-master\backend
python sync.py
